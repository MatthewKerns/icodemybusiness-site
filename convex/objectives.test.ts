/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";
import { MAX_BATCH_DOCS } from "./lib/objectiveOps";

const modules = import.meta.glob("./**/*.ts");

const OWNER = {
  subject: "user_owner",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|user_owner",
  email: "matt@icodemybusiness.com",
  emailVerified: true,
};

const OUTSIDER = {
  subject: "user_outsider",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|user_outsider",
  email: "attacker@gmail.com",
  emailVerified: true,
};

let saved: string | undefined;
beforeEach(() => {
  saved = process.env.OWNER_EMAIL_DOMAINS;
  process.env.OWNER_EMAIL_DOMAINS = "icodemybusiness.com";
});
afterEach(() => {
  if (saved === undefined) delete process.env.OWNER_EMAIL_DOMAINS;
  else process.env.OWNER_EMAIL_DOMAINS = saved;
});

/** Owner client with one objective and a 2-level to-do tree already in place. */
async function seeded() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(OWNER);
  const objectiveId = await owner.mutation(api.objectives.createObjective, {
    title: "Rock 1",
    period: "week",
    periodKey: "2026-W35",
    weightPct: 60,
  });
  await owner.mutation(api.objectives.applyOps, {
    label: "seed",
    source: "manual",
    ops: [
      { op: "createTodo", tempId: "t:a", objectiveId, title: "Parent A" },
      { op: "createTodo", tempId: "t:a1", objectiveId, parentId: "t:a", title: "Child A1" },
      { op: "createTodo", tempId: "t:b", objectiveId, title: "Parent B" },
    ],
  });
  const plan = await owner.query(api.objectives.getPlan, {});
  const idOf = (title: string) => plan.todos.find((x) => x.title === title)!.id;
  return { t, owner, objectiveId, plan, idOf };
}

describe("owner gate", () => {
  it("refuses an unauthenticated caller", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.objectives.getPlan, {})).rejects.toThrow(/Unauthorized/);
  });

  it("refuses a signed-in non-owner", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(OUTSIDER).query(api.objectives.getPlan, {}),
    ).rejects.toThrow(/Forbidden/);
    await expect(
      t.withIdentity(OUTSIDER).mutation(api.objectives.createObjective, {
        title: "Sneaky",
        period: "week",
        periodKey: "2026-W35",
      }),
    ).rejects.toThrow(/Forbidden/);
  });

  it("refuses an unverified owner-domain address", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t
        .withIdentity({ ...OWNER, emailVerified: false })
        .query(api.objectives.getPlan, {}),
    ).rejects.toThrow(/Forbidden/);
  });

  it("allows the owner", async () => {
    const t = convexTest(schema, modules);
    const plan = await t.withIdentity(OWNER).query(api.objectives.getPlan, {});
    expect(plan).toEqual({ objectives: [], todos: [] });
  });
});

describe("applyOps", () => {
  it("creates a tree with resolved parent ids and paths", async () => {
    const { plan, idOf } = await seeded();
    expect(plan.todos).toHaveLength(3);
    const a = plan.todos.find((t) => t.title === "Parent A")!;
    const a1 = plan.todos.find((t) => t.title === "Child A1")!;
    expect(a1.parentId).toBe(a.id);
    expect(a1.path).toEqual([a.id]);
    expect(idOf("Parent B")).toBeTruthy();
  });

  it("is atomic — one invalid op leaves the plan byte-identical", async () => {
    const { owner, objectiveId, idOf } = await seeded();
    const before = await owner.query(api.objectives.getPlan, {});

    await expect(
      owner.mutation(api.objectives.applyOps, {
        label: "half-bad batch",
        source: "manual",
        ops: [
          { op: "setTodoStatus", todoId: idOf("Parent B"), status: "done" },
          { op: "createTodo", tempId: "t:x", objectiveId, title: "Never lands" },
          { op: "setTodoStatus", todoId: idOf("Parent A"), status: "not-a-status" },
        ],
      }),
    ).rejects.toThrow(/Unknown to-do status/);

    const after = await owner.query(api.objectives.getPlan, {});
    expect(after).toEqual(before);
  });

  it("refuses a batch that would exceed the document cap", async () => {
    const { owner, objectiveId } = await seeded();
    const ops = Array.from({ length: MAX_BATCH_DOCS + 5 }, (_, i) => ({
      op: "createTodo" as const,
      tempId: `t:bulk${i}`,
      objectiveId,
      title: `Bulk ${i}`,
    }));
    await expect(
      owner.mutation(api.objectives.applyOps, { label: "too big", source: "ai", ops }),
    ).rejects.toThrow(/too large/);

    const after = await owner.query(api.objectives.getPlan, {});
    expect(after.todos).toHaveLength(3);
  });

  it("refuses a move under the node's own descendant", async () => {
    const { owner, idOf } = await seeded();
    await expect(
      owner.mutation(api.objectives.applyOps, {
        label: "cycle",
        source: "manual",
        ops: [{ op: "moveTodo", todoId: idOf("Parent A"), newParentId: idOf("Child A1") }],
      }),
    ).rejects.toThrow(/own descendant/);
  });

  it("rebalances peer weights to exactly 100", async () => {
    const { t, owner, objectiveId } = await seeded();
    const second = await owner.mutation(api.objectives.createObjective, {
      title: "Rock 2",
      period: "week",
      periodKey: "2026-W35",
      weightPct: 40,
    });
    void t;

    await owner.mutation(api.objectives.applyOps, {
      label: "lean into rock 1",
      source: "ai",
      ops: [{ op: "setObjectiveWeight", objectiveId, weightPct: 80 }],
    });

    const plan = await owner.query(api.objectives.getPlan, {});
    const total = plan.objectives.reduce((sum, o) => sum + o.weightPct, 0);
    expect(total).toBe(100);
    expect(plan.objectives.find((o) => o.id === objectiveId)!.weightPct).toBe(80);
    expect(plan.objectives.find((o) => o.id === second)!.weightPct).toBe(20);
  });
});

describe("previewOps", () => {
  it("returns exactly the changes applyOps performs", async () => {
    const { owner, idOf } = await seeded();
    const ops = [
      { op: "setTodoStatus" as const, todoId: idOf("Parent B"), status: "doing" },
      { op: "setToday" as const, todoId: idOf("Parent B"), date: "2026-08-31" },
    ];

    const preview = await owner.query(api.objectives.previewOps, { ops });
    expect(preview.rejected).toHaveLength(0);
    expect(preview.errors).toHaveLength(0);

    await owner.mutation(api.objectives.applyOps, { label: "focus B", source: "manual", ops });
    const plan = await owner.query(api.objectives.getPlan, {});
    const b = plan.todos.find((t) => t.title === "Parent B")!;

    // Every field the preview promised to change actually changed.
    for (const change of preview.changes) {
      if (change.kind !== "patchTodo") continue;
      for (const [key, value] of Object.entries(change.after)) {
        expect((b as unknown as Record<string, unknown>)[key]).toEqual(value);
      }
    }
    expect(b.status).toBe("doing");
    expect(b.todayDate).toBe("2026-08-31");
  });

  it("reports rejected ops instead of throwing", async () => {
    const { owner } = await seeded();
    const preview = await owner.query(api.objectives.previewOps, {
      ops: [{ op: "setTodoStatus", todoId: "nonexistent", status: "done" }],
    });
    expect(preview.changes).toHaveLength(0);
    expect(preview.rejected[0].reason).toMatch(/Unknown to-do/);
  });
});

describe("revertBatch", () => {
  it("restores the plan exactly after a mixed create/patch/move batch", async () => {
    const { owner, objectiveId, idOf } = await seeded();
    const before = await owner.query(api.objectives.getPlan, {});

    const { batchId } = await owner.mutation(api.objectives.applyOps, {
      label: "big reshuffle",
      source: "ai",
      ops: [
        { op: "createTodo", tempId: "t:new", objectiveId, title: "Brand new" },
        { op: "moveTodo", todoId: idOf("Parent B"), newParentId: idOf("Parent A") },
        { op: "setTodoStatus", todoId: idOf("Child A1"), status: "done" },
        { op: "setObjectiveWeight", objectiveId, weightPct: 90 },
      ],
    });

    const changed = await owner.query(api.objectives.getPlan, {});
    expect(changed.todos).toHaveLength(4);
    expect(changed.todos.find((t) => t.title === "Parent B")!.parentId).toBe(idOf("Parent A"));

    await owner.mutation(api.objectives.revertBatch, { batchId });

    const restored = await owner.query(api.objectives.getPlan, {});
    const normalize = (plan: typeof restored) => ({
      objectives: [...plan.objectives].sort((a, b) => a.id.localeCompare(b.id)),
      todos: [...plan.todos].sort((a, b) => a.id.localeCompare(b.id)),
    });
    expect(normalize(restored)).toEqual(normalize(before));
  });

  it("restores the ORIGINAL value when a field changed twice in one batch", async () => {
    const { owner, idOf } = await seeded();
    const { batchId } = await owner.mutation(api.objectives.applyOps, {
      label: "double touch",
      source: "manual",
      ops: [
        { op: "setTodoStatus", todoId: idOf("Parent A"), status: "doing" },
        { op: "setTodoStatus", todoId: idOf("Parent A"), status: "done" },
      ],
    });
    await owner.mutation(api.objectives.revertBatch, { batchId });

    const plan = await owner.query(api.objectives.getPlan, {});
    expect(plan.todos.find((t) => t.title === "Parent A")!.status).toBe("todo");
  });

  it("refuses to revert the same batch twice", async () => {
    const { owner, idOf } = await seeded();
    const { batchId } = await owner.mutation(api.objectives.applyOps, {
      label: "once",
      source: "manual",
      ops: [{ op: "setTodoStatus", todoId: idOf("Parent A"), status: "done" }],
    });
    await owner.mutation(api.objectives.revertBatch, { batchId });
    await expect(
      owner.mutation(api.objectives.revertBatch, { batchId }),
    ).rejects.toThrow(/Already reverted/);
  });
});

describe("archive and restore", () => {
  it("erases a subtree and puts it back", async () => {
    const { owner, idOf } = await seeded();
    const parentA = idOf("Parent A");

    await owner.mutation(api.objectives.applyOps, {
      label: "erase A",
      source: "manual",
      ops: [{ op: "archiveSubtree", todoId: parentA }],
    });

    const afterArchive = await owner.query(api.objectives.getPlan, {});
    expect(afterArchive.todos.map((t) => t.title)).toEqual(["Parent B"]);

    const roots = await owner.query(api.objectives.listArchivedRoots, {});
    expect(roots).toHaveLength(1);
    expect(roots[0]).toMatchObject({ id: parentA, title: "Parent A", size: 2 });

    await owner.mutation(api.objectives.applyOps, {
      label: "undo erase",
      source: "manual",
      ops: [{ op: "restoreSubtree", todoId: parentA }],
    });

    const restored = await owner.query(api.objectives.getPlan, {});
    expect(restored.todos.map((t) => t.title).sort()).toEqual([
      "Child A1",
      "Parent A",
      "Parent B",
    ]);
  });
});

describe("owner settings", () => {
  it("defaults the overhead budget and round-trips an edit", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(OWNER);
    expect(await owner.query(api.objectives.getOwnerSettings, {})).toMatchObject({
      overheadWeeklyBudgetHours: 10,
    });

    await owner.mutation(api.objectives.setOwnerSettings, {
      overheadWeeklyBudgetHours: 4,
      mangoOverheadKey: "icmb-overhead",
    });
    expect(await owner.query(api.objectives.getOwnerSettings, {})).toMatchObject({
      overheadWeeklyBudgetHours: 4,
      mangoOverheadKey: "icmb-overhead",
    });
  });

  it("rejects an out-of-range budget", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(OWNER).mutation(api.objectives.setOwnerSettings, {
        overheadWeeklyBudgetHours: 500,
      }),
    ).rejects.toThrow(/between 0 and 168/);
  });
});
