import { describe, it, expect } from "vitest";
import {
  ORDER_STEP,
  MAX_DEPTH,
  computeOrder,
  rebalanceWeights,
  validateOps,
  simulateOps,
  subtreeOf,
  foldChanges,
  type Plan,
  type PlanTodo,
  type ReorgOp,
} from "./lib/objectiveOps";

function todo(id: string, over: Partial<PlanTodo> = {}): PlanTodo {
  return {
    id,
    objectiveId: "obj1",
    parentId: undefined,
    path: [],
    title: id,
    status: "todo",
    order: ORDER_STEP,
    ...over,
  };
}

/**
 *   obj1
 *     a  (order 1024)
 *       a1 (order 1024)
 *         a1x
 *       a2 (order 2048)
 *     b  (order 2048)
 */
function samplePlan(): Plan {
  return {
    objectives: [
      {
        id: "obj1",
        title: "Rock 1",
        period: "week",
        periodKey: "2026-W35",
        status: "active",
        weightPct: 50,
        order: ORDER_STEP,
      },
      {
        id: "obj2",
        title: "Rock 2",
        period: "week",
        periodKey: "2026-W35",
        status: "active",
        weightPct: 30,
        order: ORDER_STEP * 2,
      },
      {
        id: "obj3",
        title: "Rock 3",
        period: "week",
        periodKey: "2026-W35",
        status: "active",
        weightPct: 20,
        order: ORDER_STEP * 3,
      },
    ],
    todos: [
      todo("a", { order: ORDER_STEP }),
      todo("a1", { parentId: "a", path: ["a"], order: ORDER_STEP }),
      todo("a1x", { parentId: "a1", path: ["a", "a1"], order: ORDER_STEP }),
      todo("a2", { parentId: "a", path: ["a"], order: ORDER_STEP * 2 }),
      todo("b", { order: ORDER_STEP * 2 }),
    ],
  };
}

describe("fractional ordering", () => {
  it("appends, prepends, and inserts between", () => {
    const siblings = [todo("x", { order: 1000 }), todo("y", { order: 2000 })];
    expect(computeOrder(siblings, undefined).order).toBe(2000 + ORDER_STEP);
    expect(computeOrder(siblings, null).order).toBe(1000 - ORDER_STEP);
    expect(computeOrder(siblings, "x").order).toBe(1500);
  });

  it("starts a fresh list at ORDER_STEP", () => {
    expect(computeOrder([], undefined)).toEqual({ order: ORDER_STEP, renumber: [] });
  });

  it("resolves beforeTodoId as after-its-predecessor", () => {
    const siblings = [
      todo("x", { order: 1000 }),
      todo("y", { order: 2000 }),
      todo("z", { order: 3000 }),
    ];
    expect(computeOrder(siblings, undefined, "z").order).toBe(2500);
    // Before the first element means "become the first element".
    expect(computeOrder(siblings, undefined, "x").order).toBe(1000 - ORDER_STEP);
  });

  it("renumbers the sibling list once the gap is exhausted", () => {
    const siblings = [todo("x", { order: 1000 }), todo("y", { order: 1000.5 })];
    const { order, renumber } = computeOrder(siblings, "x");
    expect(renumber).toEqual([
      { id: "x", order: ORDER_STEP },
      { id: "y", order: ORDER_STEP * 2 },
    ]);
    // And the insert lands cleanly between the renumbered neighbours.
    expect(order).toBe(ORDER_STEP * 1.5);
  });

  it("keeps keys strictly increasing through repeated midpoint inserts", () => {
    let siblings = [todo("x", { order: 1000 }), todo("y", { order: 2000 })];
    for (let i = 0; i < 40; i++) {
      const { order, renumber } = computeOrder(siblings, "x");
      const byId = new Map(renumber.map((r) => [r.id, r.order]));
      siblings = siblings.map((s) => ({ ...s, order: byId.get(s.id) ?? s.order }));
      siblings.push(todo(`n${i}`, { order }));
      siblings.sort((a, b) => a.order - b.order);
    }
    const orders = siblings.map((s) => s.order);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThan(orders[i - 1]);
    }
    expect(new Set(orders).size).toBe(orders.length);
  });
});

describe("weight rebalancing", () => {
  it("rescales peers so the period sums to exactly 100", () => {
    const plan = samplePlan();
    const weights = rebalanceWeights(plan.objectives, "obj1", 70);
    expect(weights.get("obj1")).toBe(70);
    const total = Array.from(weights.values()).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
    // Peers keep their relative proportion (30:20 of the remaining 30).
    expect(weights.get("obj2")).toBe(18);
    expect(weights.get("obj3")).toBe(12);
  });

  it("still sums to 100 when the split does not divide evenly", () => {
    const plan = samplePlan();
    const weights = rebalanceWeights(plan.objectives, "obj1", 51);
    expect(Array.from(weights.values()).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("gives a lone objective the whole allocation", () => {
    const weights = rebalanceWeights([samplePlan().objectives[0]], "obj1", 40);
    expect(weights.get("obj1")).toBe(100);
  });

  it("clamps out-of-range input", () => {
    const plan = samplePlan();
    expect(rebalanceWeights(plan.objectives, "obj1", 900).get("obj1")).toBe(100);
    expect(rebalanceWeights(plan.objectives, "obj1", -5).get("obj1")).toBe(0);
  });
});

describe("validateOps", () => {
  it("refuses a move under the node's own descendant", () => {
    const { valid, rejected } = validateOps(samplePlan(), [
      { op: "moveTodo", todoId: "a", newParentId: "a1x" },
    ]);
    expect(valid).toHaveLength(0);
    expect(rejected[0].reason).toMatch(/own descendant/);
  });

  it("refuses a node becoming its own parent", () => {
    const { rejected } = validateOps(samplePlan(), [
      { op: "moveTodo", todoId: "a", newParentId: "a" },
    ]);
    expect(rejected[0].reason).toMatch(/its own parent/);
  });

  it("refuses nesting past MAX_DEPTH", () => {
    const plan = samplePlan();
    // Build a chain already at the limit.
    let parent = "a1x";
    const chain = ["a", "a1", "a1x"];
    for (let i = plan.todos.length; chain.length < MAX_DEPTH; i++) {
      const id = `deep${i}`;
      plan.todos.push(todo(id, { parentId: parent, path: [...chain] }));
      chain.push(id);
      parent = id;
    }
    const { rejected } = validateOps(plan, [
      { op: "createTodo", tempId: "t1", objectiveId: "obj1", parentId: parent, title: "too deep" },
    ]);
    expect(rejected[0].reason).toMatch(/deeper than/);
  });

  it("refuses unknown ids, unknown statuses, and malformed dates", () => {
    const { rejected } = validateOps(samplePlan(), [
      { op: "setTodoStatus", todoId: "nope", status: "todo" },
      { op: "setTodoStatus", todoId: "a", status: "procrastinating" },
      { op: "setToday", todoId: "a", date: "next tuesday" },
      { op: "setObjectiveWeight", objectiveId: "obj1", weightPct: 900 },
      { op: "frobnicate", todoId: "a" },
      "not an object",
    ]);
    expect(rejected).toHaveLength(6);
    expect(rejected[4].reason).toMatch(/Unknown op/);
    expect(rejected[5].reason).toMatch(/Not an object/);
  });

  it("accepts references to ids created earlier in the same batch", () => {
    const { valid, rejected } = validateOps(samplePlan(), [
      { op: "createObjective", tempId: "o:new", title: "Rock 4", period: "week", periodKey: "2026-W35" },
      { op: "createTodo", tempId: "t:new", objectiveId: "o:new", title: "First step" },
      { op: "setTodoStatus", todoId: "t:new", status: "doing" },
    ]);
    expect(rejected).toHaveLength(0);
    expect(valid).toHaveLength(3);
  });
});

describe("simulateOps", () => {
  it("does not mutate the input plan", () => {
    const plan = samplePlan();
    const snapshot = JSON.stringify(plan);
    simulateOps(plan, [{ op: "setTodoStatus", todoId: "a", status: "done" }]);
    expect(JSON.stringify(plan)).toBe(snapshot);
  });

  it("rewrites path and objectiveId for the whole moved subtree", () => {
    const { plan } = simulateOps(samplePlan(), [
      { op: "moveTodo", todoId: "a1", newParentId: null, newObjectiveId: "obj2" },
    ]);
    const byId = new Map(plan.todos.map((t) => [t.id, t]));
    expect(byId.get("a1")!.path).toEqual([]);
    expect(byId.get("a1")!.parentId).toBeUndefined();
    expect(byId.get("a1")!.objectiveId).toBe("obj2");
    // The descendant follows its parent, keeping its relative shape.
    expect(byId.get("a1x")!.path).toEqual(["a1"]);
    expect(byId.get("a1x")!.objectiveId).toBe("obj2");
  });

  it("never leaves a node in its own path", () => {
    const ops: ReorgOp[] = [
      { op: "moveTodo", todoId: "a2", newParentId: "a1x" },
      { op: "moveTodo", todoId: "b", newParentId: "a2" },
      { op: "moveTodo", todoId: "a1", newParentId: null },
    ];
    const { plan } = simulateOps(samplePlan(), ops);
    for (const node of plan.todos) {
      expect(node.path).not.toContain(node.id);
      if (node.parentId) {
        expect(plan.todos.some((t) => t.id === node.parentId)).toBe(true);
        expect(node.path[node.path.length - 1]).toBe(node.parentId);
      }
    }
  });

  it("catches a cycle created by an earlier op in the same batch", () => {
    // Validation passes op-by-op against the ORIGINAL plan; the simulator has to
    // re-check against simulated state.
    const { errors } = simulateOps(samplePlan(), [
      { op: "moveTodo", todoId: "b", newParentId: "a1x" },
      { op: "moveTodo", todoId: "a", newParentId: "b" },
    ]);
    expect(errors[0]).toMatch(/own descendant/);
  });

  it("archives exactly the subtree and restores it exactly", () => {
    const archived = simulateOps(samplePlan(), [{ op: "archiveSubtree", todoId: "a1" }]).plan;
    const ids = archived.todos.filter((t) => t.archivedAt !== undefined).map((t) => t.id).sort();
    expect(ids).toEqual(["a1", "a1x"]);
    expect(archived.todos.find((t) => t.id === "b")!.archivedAt).toBeUndefined();

    const restored = simulateOps(archived, [{ op: "restoreSubtree", todoId: "a1" }]).plan;
    expect(restored.todos.every((t) => t.archivedAt === undefined)).toBe(true);
  });

  it("restoring an inner subtree does not resurrect the outer one", () => {
    const outer = simulateOps(samplePlan(), [{ op: "archiveSubtree", todoId: "a" }]).plan;
    // "a1" was archived as part of "a", so it is not its own archive root.
    const { rejected } = validateOps(outer, [{ op: "restoreSubtree", todoId: "a1" }]);
    expect(rejected[0].reason).toMatch(/Not the root/);

    const restored = simulateOps(outer, [{ op: "restoreSubtree", todoId: "a" }]).plan;
    expect(restored.todos.every((t) => t.archivedAt === undefined)).toBe(true);
  });

  it("splits a to-do into ordered children", () => {
    const { plan } = simulateOps(samplePlan(), [
      { op: "splitTodo", todoId: "b", intoTitles: ["part one", "part two", "part three"] },
    ]);
    const children = plan.todos
      .filter((t) => t.parentId === "b")
      .sort((x, y) => x.order - y.order);
    expect(children.map((c) => c.title)).toEqual(["part one", "part two", "part three"]);
    expect(children.every((c) => c.path.includes("b"))).toBe(true);
  });

  it("pins and unpins today", () => {
    const pinned = simulateOps(samplePlan(), [
      { op: "setToday", todoId: "a2", date: "2026-08-31" },
    ]).plan;
    expect(pinned.todos.find((t) => t.id === "a2")!.todayDate).toBe("2026-08-31");

    const unpinned = simulateOps(pinned, [{ op: "setToday", todoId: "a2", date: null }]).plan;
    expect(unpinned.todos.find((t) => t.id === "a2")!.todayDate).toBeUndefined();
  });

  it("records the ORIGINAL value when a field is touched twice in one batch", () => {
    // Undo must return to the pre-batch state, not to the intermediate one.
    const { changes } = simulateOps(samplePlan(), [
      { op: "setTodoStatus", todoId: "a", status: "doing" },
      { op: "setTodoStatus", todoId: "a", status: "done" },
    ]);
    const folded = foldChanges(changes);
    expect(folded.beforeTodos).toEqual([{ id: "a", fields: { status: "todo" } }]);
  });

  it("does not record an undo delta for docs created in the same batch", () => {
    const { changes } = simulateOps(samplePlan(), [
      { op: "createTodo", tempId: "t1", objectiveId: "obj1", title: "fresh" },
      { op: "setTodoStatus", todoId: "t1", status: "doing" },
    ]);
    const folded = foldChanges(changes);
    expect(folded.createdTodoTempIds).toHaveLength(1);
    expect(folded.beforeTodos).toHaveLength(0);
  });
});

describe("subtreeOf", () => {
  it("returns the node first, then every descendant", () => {
    const ids = subtreeOf(samplePlan(), "a").map((t) => t.id);
    expect(ids[0]).toBe("a");
    expect(ids.slice(1).sort()).toEqual(["a1", "a1x", "a2"]);
  });
});
