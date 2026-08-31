import { v, ConvexError } from "convex/values";
import {
  mutation,
  query,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireOwner } from "./lib/auth";
import { rateLimit } from "./lib/rateLimits";
import { callClaudeTool, MODEL, type ClaudeTool } from "./lib/anthropic";
import {
  reorgOpValidator,
  validateOps,
  UNMAPPED_INTENT_KEYS,
  OBJECTIVE_STATUSES,
  TODO_STATUSES,
  MAX_DEPTH,
  type Plan,
  type ReorgOp,
} from "./lib/objectiveOps";

const MAX_REQUEST_CHARS = 2000;
const MAX_PLAN_CHARS = 10_000;

interface UnmappedIntent {
  intentKey: string;
  description: string;
  why: string;
}

interface ProposalResult {
  ops?: unknown[];
  rationale?: string;
  unmapped?: UnmappedIntent[];
}

// --- Prompt -----------------------------------------------------------------

/**
 * The op list is stated in full because the model may only propose things we
 * already implement. The unmapped instruction is the load-bearing part: a
 * request the op set cannot express is the signal for what to build next, and
 * it is worth far more than a plausible-looking approximation.
 */
const SYSTEM = `You are the reorganization assistant for a solo contractor's objectives dashboard.

The operator runs iCodeMyBusiness. Paid client work earns; planning and overhead do not. Your job is to turn a plain-language situation report into a concrete, minimal change to their plan so their limited unpaid hours land on the right objective.

You do not have write access. You propose a change; the operator reviews it as a diff and decides.

AVAILABLE OPERATIONS — you may propose ONLY these:
- createObjective { tempId, title, period: "week"|"month"|"quarter", periodKey, weightPct?, notes? }
- setObjectiveStatus { objectiveId, status: ${OBJECTIVE_STATUSES.join("|")} }
- setObjectiveWeight { objectiveId, weightPct }   // 0-100; peers are rescaled automatically so the period sums to 100. Set ONE objective's weight rather than trying to balance them all.
- createTodo { tempId, objectiveId, parentId?, title, estimateMinutes?, afterTodoId? }
- moveTodo { todoId, newObjectiveId?, newParentId?, afterTodoId?, beforeTodoId? }   // reorder and re-parent
- setTodoStatus { todoId, status: ${TODO_STATUSES.join("|")} }
- setTodoFields { todoId, title?, notes?, estimateMinutes? }
- setToday { todoId, date }        // "YYYY-MM-DD" to target it for a day, null to unpin
- deferTodo { todoId, until }      // "YYYY-MM-DD", or null to clear
- archiveSubtree { todoId }        // erase a to-do and everything under it (reversible)
- restoreSubtree { todoId }
- splitTodo { todoId, intoTitles }  // at least two titles; becomes child steps

RULES
- Use the real ids from the plan below. Use tempId strings only for things you are creating in this same batch, and you may reference a tempId in a later op.
- Nesting is capped at ${MAX_DEPTH} levels.
- Be surgical. A good proposal is a handful of ops the operator can read in ten seconds, not a rewrite of their plan. Prefer adjusting emphasis and today's targets over restructuring.
- Never invent work the operator did not mention. Do not add to-dos that merely restate an objective's title.
- When they say an objective was blocked and is now unblocked, the useful change is usually: set its status back to active, raise its weight, and pin its next one or two concrete steps to today — while unpinning today's items from the objectives you are de-emphasising.

WHAT YOU CANNOT DO
If any part of the request cannot be expressed with the operations above, DO NOT approximate it and DO NOT silently drop it. Record it in "unmapped", naming the closest intentKey from this list: ${UNMAPPED_INTENT_KEYS.join(", ")}. Explain in "why" what operation would have been needed. This is genuinely more valuable than a clever workaround — it is how the operator decides which tooling to build next. It is entirely fine to return zero ops and one unmapped entry.`;

function proposalTool(): ClaudeTool {
  return {
    name: "propose_reorganization",
    description:
      "Propose a reviewable change to the operator's plan, plus anything the available operations could not express.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["ops", "rationale", "unmapped"],
      properties: {
        ops: {
          type: "array",
          description:
            "The proposed operations, in the order they should be applied. May be empty.",
          items: {
            type: "object",
            required: ["op"],
            properties: {
              op: {
                type: "string",
                enum: [
                  "createObjective",
                  "setObjectiveStatus",
                  "setObjectiveWeight",
                  "createTodo",
                  "moveTodo",
                  "setTodoStatus",
                  "setTodoFields",
                  "setToday",
                  "deferTodo",
                  "archiveSubtree",
                  "restoreSubtree",
                  "splitTodo",
                ],
              },
              tempId: { type: "string" },
              objectiveId: { type: "string" },
              todoId: { type: "string" },
              parentId: { type: ["string", "null"] },
              newParentId: { type: ["string", "null"] },
              newObjectiveId: { type: "string" },
              afterTodoId: { type: ["string", "null"] },
              beforeTodoId: { type: ["string", "null"] },
              title: { type: "string" },
              notes: { type: "string" },
              status: { type: "string" },
              period: { type: "string", enum: ["week", "month", "quarter"] },
              periodKey: { type: "string" },
              weightPct: { type: "number" },
              estimateMinutes: { type: ["number", "null"] },
              date: { type: ["string", "null"] },
              until: { type: ["string", "null"] },
              intoTitles: { type: "array", items: { type: "string" } },
            },
          },
        },
        rationale: {
          type: "string",
          description: "One short paragraph: why this is the right change right now.",
        },
        unmapped: {
          type: "array",
          description:
            "Parts of the request no available operation can express. Empty when the request was fully covered.",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["intentKey", "description", "why"],
            properties: {
              intentKey: { type: "string", enum: [...UNMAPPED_INTENT_KEYS] },
              description: { type: "string" },
              why: { type: "string" },
            },
          },
        },
      },
    },
  };
}

/** The plan as an indented outline the model can reference by id. */
function renderPlan(plan: Plan, today: string): string {
  const lines: string[] = [`Today is ${today}.`, "", "OBJECTIVES:"];

  const objectives = [...plan.objectives].sort((a, b) => a.order - b.order);
  for (const objective of objectives) {
    lines.push(
      `- [${objective.id}] "${objective.title}" — ${objective.status}, weight ${objective.weightPct}%, ${objective.period} ${objective.periodKey}` +
        (objective.notes ? ` (${objective.notes})` : ""),
    );

    const scoped = plan.todos.filter((t) => t.objectiveId === objective.id);
    const byParent = new Map<string, typeof scoped>();
    for (const todo of scoped) {
      const key = todo.parentId ?? "";
      byParent.set(key, [...(byParent.get(key) ?? []), todo]);
    }
    const walk = (parentKey: string, depth: number) => {
      const siblings = [...(byParent.get(parentKey) ?? [])].sort((a, b) => a.order - b.order);
      for (const todo of siblings) {
        const flags = [
          todo.status,
          todo.todayDate === today ? "TODAY" : null,
          todo.deferUntil ? `deferred->${todo.deferUntil}` : null,
          todo.estimateMinutes ? `${todo.estimateMinutes}m` : null,
        ]
          .filter(Boolean)
          .join(", ");
        lines.push(`${"  ".repeat(depth + 1)}- [${todo.id}] "${todo.title}" (${flags})`);
        walk(todo.id, depth + 1);
      }
    };
    walk("", 0);
  }

  if (objectives.length === 0) lines.push("(none yet)");
  return lines.join("\n").slice(0, MAX_PLAN_CHARS);
}

// --- Public API -------------------------------------------------------------

export const submitRequest = mutation({
  args: {
    rawText: v.string(),
    today: v.string(),
  },
  handler: async (ctx, args) => {
    const { clerkUserId } = await requireOwner(ctx);

    const rawText = args.rawText.trim();
    if (!rawText) throw new ConvexError("Describe what you want to change");
    if (rawText.length > MAX_REQUEST_CHARS) {
      throw new ConvexError(`Keep the request under ${MAX_REQUEST_CHARS} characters`);
    }

    await rateLimit(ctx, { name: "reorgIntake", key: clerkUserId, throws: true });

    const requestId = await ctx.db.insert("reorgRequests", {
      rawText,
      status: "pending",
      edited: false,
      unmapped: [],
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.objectivesIntake.proposeOps, {
      requestId,
      today: args.today,
    });

    return requestId;
  },
});

export const getRequest = query({
  args: { requestId: v.id("reorgRequests") },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    return await ctx.db.get(args.requestId);
  },
});

export const listRequests = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    return await ctx.db
      .query("reorgRequests")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
  },
});

/**
 * What the operator keeps asking for that the tooling cannot do.
 *
 * This is the whole reason every request is logged: rather than guessing which
 * reorganization features to build, the top of this list is the answer, ranked
 * by how often it actually comes up.
 */
export const reorgPatterns = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const requests = await ctx.db
      .query("reorgRequests")
      .withIndex("by_createdAt")
      .order("desc")
      .take(300);

    const byIntent = new Map<
      string,
      { intentKey: string; count: number; lastSeen: number; examples: string[] }
    >();
    for (const request of requests) {
      for (const intent of request.unmapped ?? []) {
        const entry = byIntent.get(intent.intentKey) ?? {
          intentKey: intent.intentKey,
          count: 0,
          lastSeen: 0,
          examples: [],
        };
        entry.count += 1;
        entry.lastSeen = Math.max(entry.lastSeen, request.createdAt);
        if (entry.examples.length < 3) entry.examples.push(intent.description);
        byIntent.set(intent.intentKey, entry);
      }
    }

    const disposition = { applied: 0, edited: 0, rejected: 0, reverted: 0, failed: 0 };
    const opUsage = new Map<string, number>();
    for (const request of requests) {
      if (request.status === "applied") disposition.applied += 1;
      if (request.status === "rejected") disposition.rejected += 1;
      if (request.status === "reverted") disposition.reverted += 1;
      if (request.status === "failed") disposition.failed += 1;
      if (request.edited) disposition.edited += 1;

      for (const op of (request.appliedOps ?? []) as ReorgOp[]) {
        opUsage.set(op.op, (opUsage.get(op.op) ?? 0) + 1);
      }
    }

    return {
      total: requests.length,
      unmapped: Array.from(byIntent.values()).sort(
        (a, b) => b.count - a.count || b.lastSeen - a.lastSeen,
      ),
      disposition,
      // Which ops actually carry the weight — the inverse signal to `unmapped`.
      opUsage: Array.from(opUsage)
        .map(([op, count]) => ({ op, count }))
        .sort((a, b) => b.count - a.count),
    };
  },
});

export const resolveRequest = mutation({
  args: {
    requestId: v.id("reorgRequests"),
    status: v.string(),
    appliedOps: v.optional(v.array(reorgOpValidator)),
    edited: v.optional(v.boolean()),
    batchId: v.optional(v.id("objectiveOpBatches")),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError("Request not found");

    await ctx.db.patch(request._id, {
      status: args.status,
      appliedOps: args.appliedOps ?? request.appliedOps,
      edited: args.edited ?? request.edited,
      batchId: args.batchId ?? request.batchId,
      resolvedAt: Date.now(),
    });
    return request._id;
  },
});

// --- Internal ---------------------------------------------------------------

export const storeProposal = internalMutation({
  args: {
    requestId: v.id("reorgRequests"),
    status: v.string(),
    proposedOps: v.optional(v.any()),
    rejectedOps: v.optional(v.any()),
    rationale: v.optional(v.string()),
    unmapped: v.optional(
      v.array(
        v.object({
          intentKey: v.string(),
          description: v.string(),
          why: v.string(),
        }),
      ),
    ),
    model: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { requestId, ...rest } = args;
    await ctx.db.patch(requestId, {
      ...rest,
      unmapped: args.unmapped ?? [],
    });
  },
});

/**
 * Map a free-form request onto the op union.
 *
 * Runs as an action so it can reach the network; it never touches ctx.db and
 * never applies anything. The output is a proposal the operator reviews.
 */
export const proposeOps = internalAction({
  args: {
    requestId: v.id("reorgRequests"),
    today: v.string(),
  },
  handler: async (ctx, args) => {
    const started = Date.now();
    const request = await ctx.runQuery(internal.objectivesIntake.internalGetRequest, {
      requestId: args.requestId,
    });
    if (!request) return;

    const plan = (await ctx.runQuery(internal.objectives.internalGetPlan, {})) as Plan;

    let result: ProposalResult | null = null;
    try {
      result = await callClaudeTool<ProposalResult>(
        SYSTEM,
        `CURRENT PLAN\n${renderPlan(plan, args.today)}\n\nOPERATOR'S REQUEST\n${request.rawText}`,
        proposalTool(),
        4000,
      );
    } catch (error) {
      console.error("Reorganization proposal failed:", error);
    }

    if (!result) {
      await ctx.runMutation(internal.objectivesIntake.storeProposal, {
        requestId: args.requestId,
        status: "failed",
        error:
          "Could not reach the model, or ANTHROPIC_API_KEY is not set in the Convex deployment env.",
        latencyMs: Date.now() - started,
      });
      return;
    }

    // Validate against the real plan before the operator ever sees it. An op the
    // model produced that our validator refuses is itself a learning signal —
    // it means the schema is being misread, or the ask is nearly-but-not-quite
    // expressible — so it is folded into `unmapped` rather than dropped.
    const { valid, rejected } = validateOps(plan, result.ops ?? []);
    const unmapped: UnmappedIntent[] = [
      ...(result.unmapped ?? []).filter(
        (entry) => entry && entry.intentKey && entry.description,
      ),
      ...rejected.map((entry) => ({
        intentKey: "other",
        description: `Model proposed an operation we refused: ${JSON.stringify(entry.op).slice(0, 300)}`,
        why: entry.reason,
      })),
    ];

    await ctx.runMutation(internal.objectivesIntake.storeProposal, {
      requestId: args.requestId,
      status: "proposed",
      proposedOps: valid,
      rejectedOps: rejected,
      rationale: result.rationale,
      unmapped,
      model: MODEL,
      latencyMs: Date.now() - started,
    });
  },
});

export const internalGetRequest = internalQuery({
  args: { requestId: v.id("reorgRequests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.requestId);
  },
});
