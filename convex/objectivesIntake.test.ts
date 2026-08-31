/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const OWNER = {
  subject: "user_owner",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|user_owner",
  email: "matt@icodemybusiness.com",
  emailVerified: true,
};
const OUTSIDER = { ...OWNER, subject: "user_out", email: "x@gmail.com" };

let savedDomains: string | undefined;
let savedKey: string | undefined;

beforeEach(() => {
  // convex-test drives the scheduler through the timer queue.
  vi.useFakeTimers();
  savedDomains = process.env.OWNER_EMAIL_DOMAINS;
  savedKey = process.env.ANTHROPIC_API_KEY;
  process.env.OWNER_EMAIL_DOMAINS = "icodemybusiness.com";
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
});

afterEach(() => {
  if (savedDomains === undefined) delete process.env.OWNER_EMAIL_DOMAINS;
  else process.env.OWNER_EMAIL_DOMAINS = savedDomains;
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedKey;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Stub the Anthropic endpoint with one forced tool call. */
function stubModel(input: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          content: [{ type: "tool_use", name: "propose_reorganization", input }],
          stop_reason: "tool_use",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    ),
  );
}

async function seeded() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(OWNER);
  const objectiveId = await owner.mutation(api.objectives.createObjective, {
    title: "Rock 1",
    period: "week",
    periodKey: "2026-W35",
    weightPct: 40,
  });
  await owner.mutation(api.objectives.applyOps, {
    label: "seed",
    source: "manual",
    ops: [{ op: "createTodo", tempId: "t:a", objectiveId, title: "Ship the auth flow" }],
  });
  const plan = await owner.query(api.objectives.getPlan, {});
  return { t, owner, objectiveId, todoId: plan.todos[0].id };
}

describe("submitRequest", () => {
  it("is owner-gated", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(OUTSIDER).mutation(api.objectivesIntake.submitRequest, {
        rawText: "reshuffle everything",
        today: "2026-08-31",
      }),
    ).rejects.toThrow(/Forbidden/);
  });

  it("rejects empty and oversized text", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(OWNER);
    await expect(
      owner.mutation(api.objectivesIntake.submitRequest, {
        rawText: "   ",
        today: "2026-08-31",
      }),
    ).rejects.toThrow(/Describe what you want/);
    await expect(
      owner.mutation(api.objectivesIntake.submitRequest, {
        rawText: "x".repeat(2001),
        today: "2026-08-31",
      }),
    ).rejects.toThrow(/under 2000 characters/);
  });
});

describe("proposeOps", () => {
  it("stores a valid proposal without applying anything", async () => {
    const { t, owner, objectiveId, todoId } = await seeded();
    stubModel({
      ops: [
        { op: "setObjectiveWeight", objectiveId, weightPct: 80 },
        { op: "setToday", todoId, date: "2026-08-31" },
      ],
      rationale: "Rock 1 is unblocked, so lean into it.",
      unmapped: [],
    });

    const requestId = await owner.mutation(api.objectivesIntake.submitRequest, {
      rawText: "rock 1 is unblocked, lean into it",
      today: "2026-08-31",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const request = await owner.query(api.objectivesIntake.getRequest, { requestId });
    expect(request?.status).toBe("proposed");
    expect(request?.proposedOps).toHaveLength(2);
    expect(request?.rationale).toMatch(/unblocked/);

    // Crucially: proposing changed nothing.
    const plan = await owner.query(api.objectives.getPlan, {});
    expect(plan.objectives[0].weightPct).toBe(40);
    expect(plan.todos[0].todayDate).toBeUndefined();
  });

  it("folds an op the validator refuses into the learning record", async () => {
    const { t, owner, objectiveId } = await seeded();
    stubModel({
      ops: [
        { op: "setObjectiveWeight", objectiveId, weightPct: 60 },
        // Hallucinated id — must never reach the operator as an applyable op.
        { op: "setTodoStatus", todoId: "does_not_exist", status: "done" },
      ],
      rationale: "…",
      unmapped: [],
    });

    const requestId = await owner.mutation(api.objectivesIntake.submitRequest, {
      rawText: "tidy up",
      today: "2026-08-31",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const request = await owner.query(api.objectivesIntake.getRequest, { requestId });
    expect(request?.proposedOps).toHaveLength(1);
    expect(request?.unmapped).toHaveLength(1);
    expect(request?.unmapped[0].why).toMatch(/Unknown to-do/);
  });

  it("records an unsupported ask instead of approximating it", async () => {
    const { t, owner } = await seeded();
    stubModel({
      ops: [],
      rationale: "There is no operation that merges two to-dos.",
      unmapped: [
        {
          intentKey: "merge-todos",
          description: "Merge the two auth to-dos into one",
          why: "No merge operation exists; splitTodo only goes the other way.",
        },
      ],
    });

    const requestId = await owner.mutation(api.objectivesIntake.submitRequest, {
      rawText: "merge those two auth items into one",
      today: "2026-08-31",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const request = await owner.query(api.objectivesIntake.getRequest, { requestId });
    expect(request?.status).toBe("proposed");
    expect(request?.proposedOps).toHaveLength(0);
    expect(request?.unmapped[0].intentKey).toBe("merge-todos");

    const patterns = await owner.query(api.objectivesIntake.reorgPatterns, {});
    expect(patterns.unmapped[0]).toMatchObject({ intentKey: "merge-todos", count: 1 });
  });

  it("marks the request failed when the model is unreachable", async () => {
    const { t, owner } = await seeded();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("upstream exploded", { status: 500 })),
    );

    const requestId = await owner.mutation(api.objectivesIntake.submitRequest, {
      rawText: "do something",
      today: "2026-08-31",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const request = await owner.query(api.objectivesIntake.getRequest, { requestId });
    expect(request?.status).toBe("failed");
    expect(request?.error).toMatch(/ANTHROPIC_API_KEY|model/);
  });
});

describe("applying a proposal", () => {
  it("records the edited disposition when ops were unchecked", async () => {
    const { t, owner, objectiveId, todoId } = await seeded();
    // A second objective, so the requested weight is actually achievable — with
    // a lone objective the rebalance correctly forces it to 100.
    await owner.mutation(api.objectives.createObjective, {
      title: "Rock 2",
      period: "week",
      periodKey: "2026-W35",
      weightPct: 60,
    });
    stubModel({
      ops: [
        { op: "setObjectiveWeight", objectiveId, weightPct: 80 },
        { op: "setToday", todoId, date: "2026-08-31" },
      ],
      rationale: "…",
      unmapped: [],
    });
    const requestId = await owner.mutation(api.objectivesIntake.submitRequest, {
      rawText: "lean in",
      today: "2026-08-31",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    // Operator keeps only the first op.
    const { batchId } = await owner.mutation(api.objectives.applyOps, {
      ops: [{ op: "setObjectiveWeight", objectiveId, weightPct: 80 }],
      label: "AI re-plan",
      source: "ai",
      requestId,
    });
    await owner.mutation(api.objectivesIntake.resolveRequest, {
      requestId,
      status: "edited_applied",
      appliedOps: [{ op: "setObjectiveWeight", objectiveId, weightPct: 80 }],
      edited: true,
      batchId,
    });

    const plan = await owner.query(api.objectives.getPlan, {});
    expect(plan.objectives.find((o) => o.id === objectiveId)!.weightPct).toBe(80);
    // The op the operator unchecked never ran.
    expect(plan.todos[0].todayDate).toBeUndefined();

    const patterns = await owner.query(api.objectivesIntake.reorgPatterns, {});
    expect(patterns.disposition.edited).toBe(1);
    expect(patterns.opUsage).toEqual([{ op: "setObjectiveWeight", count: 1 }]);
  });

  it("flips the request to reverted when its batch is undone", async () => {
    const { t, owner, objectiveId } = await seeded();
    stubModel({
      ops: [{ op: "setObjectiveWeight", objectiveId, weightPct: 90 }],
      rationale: "…",
      unmapped: [],
    });
    const requestId = await owner.mutation(api.objectivesIntake.submitRequest, {
      rawText: "lean in hard",
      today: "2026-08-31",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const { batchId } = await owner.mutation(api.objectives.applyOps, {
      ops: [{ op: "setObjectiveWeight", objectiveId, weightPct: 90 }],
      label: "AI re-plan",
      source: "ai",
      requestId,
    });
    await owner.mutation(api.objectivesIntake.resolveRequest, {
      requestId,
      status: "applied",
      batchId,
    });

    await owner.mutation(api.objectives.revertBatch, { batchId });

    const request = await owner.query(api.objectivesIntake.getRequest, { requestId });
    expect(request?.status).toBe("reverted");
    const plan = await owner.query(api.objectives.getPlan, {});
    expect(plan.objectives[0].weightPct).toBe(40);
  });
});
