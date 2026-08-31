import { v, ConvexError } from "convex/values";
import {
  query,
  mutation,
  internalQuery,
  internalMutation,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";
import { Id, Doc } from "./_generated/dataModel";
import { requireOwner } from "./lib/auth";
import {
  reorgOpValidator,
  validateOps,
  simulateOps,
  foldChanges,
  MAX_BATCH_DOCS,
  MAX_NODES_PER_OBJECTIVE,
  ORDER_STEP,
  OBJECTIVE_STATUSES,
  PERIODS,
  type Plan,
  type PlanObjective,
  type PlanTodo,
  type ReorgOp,
  type Change,
} from "./lib/objectiveOps";

const MAX_OBJECTIVES = 100;
const DEFAULT_OVERHEAD_BUDGET_HOURS = 10;
/** Undo history horizon; older batches are pruned by the daily cron. */
const BATCH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

// --- Plan loading -----------------------------------------------------------

function toPlanObjective(doc: Doc<"objectives">): PlanObjective {
  return {
    id: doc._id,
    title: doc.title,
    notes: doc.notes,
    period: doc.period,
    periodKey: doc.periodKey,
    status: doc.status,
    weightPct: doc.weightPct,
    order: doc.order,
    archivedAt: doc.archivedAt,
    mangoKey: doc.mangoKey,
    mangoObjectiveId: doc.mangoObjectiveId,
  };
}

function toPlanTodo(doc: Doc<"objectiveTodos">): PlanTodo {
  return {
    id: doc._id,
    objectiveId: doc.objectiveId,
    parentId: doc.parentId,
    path: doc.path as unknown as string[],
    title: doc.title,
    notes: doc.notes,
    status: doc.status,
    estimateMinutes: doc.estimateMinutes,
    order: doc.order,
    todayDate: doc.todayDate,
    deferUntil: doc.deferUntil,
    archivedAt: doc.archivedAt,
    archiveRootId: doc.archiveRootId,
  };
}

/**
 * The whole plan, in memory. Everything downstream — validate, simulate, diff,
 * apply — works on this single snapshot, so the diff the operator approves and
 * the writes that land are computed from identical input.
 */
async function loadPlan(ctx: QueryCtx | MutationCtx): Promise<Plan> {
  const objectiveDocs = await ctx.db
    .query("objectives")
    .withIndex("by_period_periodKey")
    .take(MAX_OBJECTIVES);

  const todos: PlanTodo[] = [];
  for (const objective of objectiveDocs) {
    const docs = await ctx.db
      .query("objectiveTodos")
      .withIndex("by_objectiveId", (q) => q.eq("objectiveId", objective._id))
      .take(MAX_NODES_PER_OBJECTIVE);
    todos.push(...docs.map(toPlanTodo));
  }

  return { objectives: objectiveDocs.map(toPlanObjective), todos };
}

// --- Queries ----------------------------------------------------------------

export const getPlan = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const plan = await loadPlan(ctx);
    if (args.includeArchived) return plan;
    return {
      objectives: plan.objectives.filter((o) => o.archivedAt === undefined),
      todos: plan.todos.filter((t) => t.archivedAt === undefined),
    };
  },
});

/** Archived subtree roots, newest first — backs the "restore" affordance. */
export const listArchivedRoots = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const plan = await loadPlan(ctx);
    return plan.todos
      .filter((t) => t.archivedAt !== undefined && t.archiveRootId === t.id)
      .map((root) => ({
        id: root.id,
        title: root.title,
        objectiveId: root.objectiveId,
        archivedAt: root.archivedAt,
        size: plan.todos.filter((t) => t.archiveRootId === root.id).length,
      }))
      .sort((a, b) => (b.archivedAt ?? 0) - (a.archivedAt ?? 0))
      .slice(0, 25);
  },
});

/**
 * Dry-run a batch and return the change list, for the reviewable diff. Uses the
 * exact same simulator as applyOps.
 */
export const previewOps = query({
  args: {
    ops: v.array(reorgOpValidator),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const plan = await loadPlan(ctx);
    const { valid, rejected } = validateOps(plan, args.ops);
    const { changes, errors } = simulateOps(plan, valid);
    const folded = foldChanges(changes);
    return {
      changes,
      rejected,
      errors,
      docCount: folded.docCount,
      tooLarge: folded.docCount > MAX_BATCH_DOCS,
    };
  },
});

export const getOwnerSettings = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const row = await ctx.db
      .query("ownerSettings")
      .withIndex("by_key", (q) => q.eq("key", "owner"))
      .first();
    return {
      overheadWeeklyBudgetHours:
        row?.overheadWeeklyBudgetHours ?? DEFAULT_OVERHEAD_BUDGET_HOURS,
      mangoOverheadKey: row?.mangoOverheadKey,
    };
  },
});

/** Recent batches, newest first — backs the undo button and the change log. */
export const listBatches = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const limit = Math.min(Math.max(args.limit ?? 10, 1), 50);
    return await ctx.db
      .query("objectiveOpBatches")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
  },
});

interface BeforeEntry {
  id: string;
  /** Fields to write back. */
  set?: Record<string, unknown>;
  /** Fields that did not exist before the batch and must be removed on undo. */
  clear?: string[];
  /** Legacy shape from batches written before set/clear existed. */
  fields?: Record<string, unknown>;
}

/**
 * Convex drops `undefined` values on write, so "this field was absent before the
 * batch" cannot survive as `{ parentId: undefined }` — the key would simply
 * vanish and the undo would silently leave the field set. Removals are therefore
 * recorded as an explicit list of field names.
 */
function splitBeforeFields(fields: Record<string, unknown>): {
  set: Record<string, unknown>;
  clear: string[];
} {
  const set: Record<string, unknown> = {};
  const clear: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) clear.push(key);
    else set[key] = value;
  }
  return { set, clear };
}

// --- Applying ops -----------------------------------------------------------

/**
 * Execute a simulated change list against the database.
 *
 * Inserts come before the patches that reference them (simulateOps emits ops in
 * order and a child can only be created after its parent), so a single forward
 * pass with an alias map resolves every temp id.
 */
async function executeChanges(
  ctx: MutationCtx,
  changes: Change[],
): Promise<{
  aliases: Map<string, string>;
  createdObjectives: Id<"objectives">[];
  createdTodos: Id<"objectiveTodos">[];
}> {
  const aliases = new Map<string, string>();
  const createdObjectives: Id<"objectives">[] = [];
  const createdTodos: Id<"objectiveTodos">[] = [];
  const now = Date.now();

  const realId = (id: string) => aliases.get(id) ?? id;

  for (const change of changes) {
    if (change.kind === "insertObjective") {
      const id = await ctx.db.insert("objectives", {
        ...change.fields,
        createdAt: now,
        updatedAt: now,
      });
      aliases.set(change.tempId, id);
      createdObjectives.push(id);
      continue;
    }

    if (change.kind === "insertTodo") {
      const fields = change.fields;
      const id = await ctx.db.insert("objectiveTodos", {
        ...fields,
        objectiveId: realId(fields.objectiveId) as Id<"objectives">,
        parentId: fields.parentId
          ? (realId(fields.parentId) as Id<"objectiveTodos">)
          : undefined,
        path: fields.path.map((step) => realId(step)) as Id<"objectiveTodos">[],
        archiveRootId: fields.archiveRootId
          ? (realId(fields.archiveRootId) as Id<"objectiveTodos">)
          : undefined,
        createdAt: now,
        updatedAt: now,
      });
      aliases.set(change.tempId, id);
      createdTodos.push(id);
      continue;
    }

    if (change.kind === "patchObjective") {
      await ctx.db.patch(realId(change.id) as Id<"objectives">, {
        ...change.after,
        updatedAt: now,
      });
      continue;
    }

    // Any id-shaped field may still hold a temp id from an insert earlier in
    // this same batch, so each one is resolved before it reaches the database.
    const after = change.after;
    const patch: Record<string, unknown> = { ...after, updatedAt: now };
    if (after.objectiveId !== undefined) patch.objectiveId = realId(after.objectiveId);
    if ("parentId" in after) {
      patch.parentId = after.parentId ? realId(after.parentId) : undefined;
    }
    if (after.path !== undefined) patch.path = after.path.map((step) => realId(step));
    if ("archiveRootId" in after) {
      patch.archiveRootId = after.archiveRootId ? realId(after.archiveRootId) : undefined;
    }
    await ctx.db.patch(
      realId(change.id) as Id<"objectiveTodos">,
      patch as Partial<Doc<"objectiveTodos">>,
    );
  }

  return { aliases, createdObjectives, createdTodos };
}

/**
 * The single write path for the plan. Every UI control, every AI proposal, and
 * any future drag-and-drop funnels through here.
 *
 * Convex mutations are one transaction, so a throw anywhere below leaves the
 * plan untouched — there is no such thing as a half-applied batch.
 */
export const applyOps = mutation({
  args: {
    ops: v.array(reorgOpValidator),
    label: v.string(),
    source: v.string(), // "manual" | "ai"
    requestId: v.optional(v.id("reorgRequests")),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    if (args.ops.length === 0) {
      throw new ConvexError("No operations to apply");
    }

    const plan = await loadPlan(ctx);

    // Re-validate server-side even for an AI proposal the client already
    // previewed: the client is not trusted either.
    const { valid, rejected } = validateOps(plan, args.ops);
    if (rejected.length > 0) {
      throw new ConvexError(`Invalid operation: ${rejected[0].reason}`);
    }

    const { changes, errors } = simulateOps(plan, valid as ReorgOp[]);
    if (errors.length > 0) {
      throw new ConvexError(errors[0]);
    }
    if (changes.length === 0) {
      throw new ConvexError("Nothing would change");
    }

    const folded = foldChanges(changes);
    if (folded.docCount > MAX_BATCH_DOCS) {
      throw new ConvexError(
        `Change set too large (${folded.docCount} documents) — split this into smaller steps`,
      );
    }

    const { aliases, createdObjectives, createdTodos } = await executeChanges(ctx, changes);
    const realId = (id: string) => aliases.get(id) ?? id;

    const batchId = await ctx.db.insert("objectiveOpBatches", {
      label: args.label,
      source: args.source,
      requestId: args.requestId,
      ops: args.ops,
      createdObjectives,
      createdTodos,
      beforeObjectives: folded.beforeObjectives.map((entry) => ({
        id: realId(entry.id),
        ...splitBeforeFields(entry.fields),
      })),
      beforeTodos: folded.beforeTodos.map((entry) => ({
        id: realId(entry.id),
        ...splitBeforeFields(entry.fields),
      })),
      docCount: folded.docCount,
      createdAt: Date.now(),
    });

    return { batchId, docCount: folded.docCount };
  },
});

/**
 * Undo one batch: patch the recorded before-values back and delete anything the
 * batch created. Recorded as a new batch of its own, so undo is itself undoable
 * and the log stays append-shaped.
 */
export const revertBatch = mutation({
  args: {
    batchId: v.id("objectiveOpBatches"),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const batch = await ctx.db.get(args.batchId);
    if (!batch) throw new ConvexError("Batch not found");
    if (batch.revertedAt !== undefined) throw new ConvexError("Already reverted");

    const now = Date.now();

    // Patch first, delete second: a created doc may be referenced by a patched
    // one, and undoing the patch removes that reference.
    const undoPatch = (entry: BeforeEntry): Record<string, unknown> => {
      const patch: Record<string, unknown> = {
        ...(entry.set ?? entry.fields ?? {}),
        updatedAt: now,
      };
      // An explicit `undefined` is how Convex removes a field.
      for (const key of entry.clear ?? []) patch[key] = undefined;
      return patch;
    };

    for (const entry of (batch.beforeObjectives ?? []) as BeforeEntry[]) {
      const doc = await ctx.db.get(entry.id as Id<"objectives">);
      if (!doc) continue;
      await ctx.db.patch(doc._id, undoPatch(entry) as Partial<Doc<"objectives">>);
    }
    for (const entry of (batch.beforeTodos ?? []) as BeforeEntry[]) {
      const doc = await ctx.db.get(entry.id as Id<"objectiveTodos">);
      if (!doc) continue;
      await ctx.db.patch(doc._id, undoPatch(entry) as Partial<Doc<"objectiveTodos">>);
    }

    for (const todoId of batch.createdTodos) {
      if (await ctx.db.get(todoId)) await ctx.db.delete(todoId);
    }
    for (const objectiveId of batch.createdObjectives) {
      if (await ctx.db.get(objectiveId)) await ctx.db.delete(objectiveId);
    }

    const revertBatchId = await ctx.db.insert("objectiveOpBatches", {
      label: `Undo: ${batch.label}`,
      source: "revert",
      ops: [],
      createdObjectives: [],
      createdTodos: [],
      beforeObjectives: [],
      beforeTodos: [],
      docCount: batch.docCount,
      createdAt: now,
    });
    await ctx.db.patch(batch._id, {
      revertedAt: now,
      revertedByBatchId: revertBatchId,
    });

    if (batch.requestId) {
      const request = await ctx.db.get(batch.requestId);
      if (request) {
        await ctx.db.patch(request._id, { status: "reverted", resolvedAt: now });
      }
    }

    return { revertBatchId };
  },
});

// --- Objective-level CRUD (outside the op union) -----------------------------

export const createObjective = mutation({
  args: {
    title: v.string(),
    notes: v.optional(v.string()),
    period: v.string(),
    periodKey: v.string(),
    weightPct: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const title = args.title.trim();
    if (!title) throw new ConvexError("Title is required");
    if (!PERIODS.includes(args.period as (typeof PERIODS)[number])) {
      throw new ConvexError(`Unknown period "${args.period}"`);
    }

    const peers = await ctx.db
      .query("objectives")
      .withIndex("by_period_periodKey", (q) =>
        q.eq("period", args.period).eq("periodKey", args.periodKey),
      )
      .take(MAX_OBJECTIVES);
    const maxOrder = peers.reduce((max, p) => Math.max(max, p.order), 0);

    const now = Date.now();
    return await ctx.db.insert("objectives", {
      title,
      notes: args.notes,
      period: args.period,
      periodKey: args.periodKey,
      status: "active",
      weightPct: args.weightPct ?? 0,
      order: maxOrder + ORDER_STEP,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateObjective = mutation({
  args: {
    objectiveId: v.id("objectives"),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
    mangoKey: v.optional(v.string()),
    mangoObjectiveId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const objective = await ctx.db.get(args.objectiveId);
    if (!objective) throw new ConvexError("Objective not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.title !== undefined) {
      const title = args.title.trim();
      if (!title) throw new ConvexError("Title is required");
      patch.title = title;
    }
    if (args.notes !== undefined) patch.notes = args.notes || undefined;
    if (args.status !== undefined) {
      if (!OBJECTIVE_STATUSES.includes(args.status as (typeof OBJECTIVE_STATUSES)[number])) {
        throw new ConvexError(`Unknown status "${args.status}"`);
      }
      patch.status = args.status;
    }
    if (args.mangoKey !== undefined) patch.mangoKey = args.mangoKey || undefined;
    if (args.mangoObjectiveId !== undefined) {
      patch.mangoObjectiveId = args.mangoObjectiveId || undefined;
    }

    await ctx.db.patch(objective._id, patch);
    return objective._id;
  },
});

/** Soft-delete an objective and everything under it. */
export const archiveObjective = mutation({
  args: { objectiveId: v.id("objectives") },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const objective = await ctx.db.get(args.objectiveId);
    if (!objective) throw new ConvexError("Objective not found");

    const now = Date.now();
    const todos = await ctx.db
      .query("objectiveTodos")
      .withIndex("by_objectiveId", (q) => q.eq("objectiveId", objective._id))
      .take(MAX_NODES_PER_OBJECTIVE);
    for (const todo of todos) {
      if (todo.archivedAt === undefined) {
        await ctx.db.patch(todo._id, {
          archivedAt: now,
          archiveRootId: todo._id,
          updatedAt: now,
        });
      }
    }
    await ctx.db.patch(objective._id, { archivedAt: now, updatedAt: now });
    return objective._id;
  },
});

export const setOwnerSettings = mutation({
  args: {
    overheadWeeklyBudgetHours: v.optional(v.number()),
    mangoOverheadKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    if (
      args.overheadWeeklyBudgetHours !== undefined &&
      (args.overheadWeeklyBudgetHours < 0 || args.overheadWeeklyBudgetHours > 168)
    ) {
      throw new ConvexError("Weekly budget must be between 0 and 168 hours");
    }

    const existing = await ctx.db
      .query("ownerSettings")
      .withIndex("by_key", (q) => q.eq("key", "owner"))
      .first();

    const patch = {
      overheadWeeklyBudgetHours:
        args.overheadWeeklyBudgetHours ??
        existing?.overheadWeeklyBudgetHours ??
        DEFAULT_OVERHEAD_BUDGET_HOURS,
      mangoOverheadKey: args.mangoOverheadKey ?? existing?.mangoOverheadKey,
      updatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("ownerSettings", { key: "owner", ...patch });
  },
});

// --- Internal ---------------------------------------------------------------

/** Plan snapshot for the AI intake action, which cannot touch ctx.db directly. */
export const internalGetPlan = internalQuery({
  args: {},
  handler: async (ctx) => {
    const plan = await loadPlan(ctx);
    return {
      objectives: plan.objectives.filter((o) => o.archivedAt === undefined),
      todos: plan.todos.filter((t) => t.archivedAt === undefined),
    };
  },
});

export const pruneOpBatches = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - BATCH_RETENTION_MS;
    const stale = await ctx.db
      .query("objectiveOpBatches")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .take(200);
    for (const batch of stale) {
      await ctx.db.delete(batch._id);
    }
    return { pruned: stale.length };
  },
});
