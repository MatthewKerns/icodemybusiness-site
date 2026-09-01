import { v } from "convex/values";

/**
 * The reorganization op layer.
 *
 * Every mutation of the plan — a button in the UI, an AI proposal, a future
 * drag-and-drop — goes through this closed set of typed operations and the pure
 * simulator below. That is what makes the AI safe (it can only emit ops we
 * already implement) and undo exact (the diff the operator reviewed and the
 * writes that land are computed by the same function).
 *
 * This module has NO Convex imports beyond the validator builder, so it is
 * unit-testable with plain vitest.
 */

// --- Limits -----------------------------------------------------------------

export const ORDER_STEP = 1024;
/** Renumber a sibling list once midpoints get this close (doubles give ~50 more). */
export const ORDER_MIN_GAP = 1;
export const MAX_DEPTH = 5;
export const MAX_SIBLINGS = 200;
export const MAX_NODES_PER_OBJECTIVE = 500;
/** Caps the blast radius of one batch — an AI proposal included. */
export const MAX_BATCH_DOCS = 300;

export const OBJECTIVE_STATUSES = ["active", "blocked", "done", "dropped"] as const;
export const TODO_STATUSES = ["todo", "doing", "blocked", "done"] as const;
export const PERIODS = ["week", "month", "quarter"] as const;

export type ObjectiveStatus = (typeof OBJECTIVE_STATUSES)[number];
export type TodoStatus = (typeof TODO_STATUSES)[number];
export type Period = (typeof PERIODS)[number];

/**
 * Starter taxonomy for requests the op set cannot express. A closed-ish
 * vocabulary is what lets the "what should we build next" view aggregate instead
 * of producing forty unique strings.
 */
export const UNMAPPED_INTENT_KEYS = [
  "merge-todos",
  "bulk-defer",
  "time-box",
  "rebalance-weights",
  "recurring",
  "delegate",
  "dependency",
  "rollover-week",
  "estimate-rollup",
  "other",
] as const;

// --- The op union -----------------------------------------------------------

export type ReorgOp =
  | {
      op: "createObjective";
      tempId: string;
      title: string;
      period: string;
      periodKey: string;
      weightPct?: number;
      notes?: string;
    }
  | { op: "setObjectiveStatus"; objectiveId: string; status: string }
  | { op: "setObjectiveWeight"; objectiveId: string; weightPct: number }
  | {
      op: "createTodo";
      tempId: string;
      objectiveId: string;
      parentId?: string | null;
      title: string;
      estimateMinutes?: number;
      afterTodoId?: string | null;
    }
  | {
      // Reorder and re-parent are one op: a reorder is a move whose parent did
      // not change, and splitting them would mean two code paths for one
      // invariant (order key + path rewrite).
      op: "moveTodo";
      todoId: string;
      newObjectiveId?: string;
      newParentId?: string | null;
      afterTodoId?: string | null;
      beforeTodoId?: string | null;
    }
  | { op: "setTodoStatus"; todoId: string; status: string }
  | {
      op: "setTodoFields";
      todoId: string;
      title?: string;
      notes?: string;
      estimateMinutes?: number | null;
    }
  | { op: "setToday"; todoId: string; date: string | null }
  | { op: "deferTodo"; todoId: string; until: string | null }
  | { op: "archiveSubtree"; todoId: string }
  | { op: "restoreSubtree"; todoId: string }
  | { op: "splitTodo"; todoId: string; intoTitles: string[] };

export type ReorgOpKind = ReorgOp["op"];

/**
 * Ids are `v.string()` rather than `v.id(...)` because the model emits them and
 * createObjective/createTodo introduce `tempId` references that only resolve
 * during simulation. Resolution to real Ids happens in simulateOps.
 */
export const reorgOpValidator = v.union(
  v.object({
    op: v.literal("createObjective"),
    tempId: v.string(),
    title: v.string(),
    period: v.string(),
    periodKey: v.string(),
    weightPct: v.optional(v.number()),
    notes: v.optional(v.string()),
  }),
  v.object({
    op: v.literal("setObjectiveStatus"),
    objectiveId: v.string(),
    status: v.string(),
  }),
  v.object({
    op: v.literal("setObjectiveWeight"),
    objectiveId: v.string(),
    weightPct: v.number(),
  }),
  v.object({
    op: v.literal("createTodo"),
    tempId: v.string(),
    objectiveId: v.string(),
    parentId: v.optional(v.union(v.string(), v.null())),
    title: v.string(),
    estimateMinutes: v.optional(v.number()),
    afterTodoId: v.optional(v.union(v.string(), v.null())),
  }),
  v.object({
    op: v.literal("moveTodo"),
    todoId: v.string(),
    newObjectiveId: v.optional(v.string()),
    newParentId: v.optional(v.union(v.string(), v.null())),
    afterTodoId: v.optional(v.union(v.string(), v.null())),
    beforeTodoId: v.optional(v.union(v.string(), v.null())),
  }),
  v.object({ op: v.literal("setTodoStatus"), todoId: v.string(), status: v.string() }),
  v.object({
    op: v.literal("setTodoFields"),
    todoId: v.string(),
    title: v.optional(v.string()),
    notes: v.optional(v.string()),
    estimateMinutes: v.optional(v.union(v.number(), v.null())),
  }),
  v.object({
    op: v.literal("setToday"),
    todoId: v.string(),
    date: v.union(v.string(), v.null()),
  }),
  v.object({
    op: v.literal("deferTodo"),
    todoId: v.string(),
    until: v.union(v.string(), v.null()),
  }),
  v.object({ op: v.literal("archiveSubtree"), todoId: v.string() }),
  v.object({ op: v.literal("restoreSubtree"), todoId: v.string() }),
  v.object({
    op: v.literal("splitTodo"),
    todoId: v.string(),
    intoTitles: v.array(v.string()),
  }),
);

// --- The in-memory plan -----------------------------------------------------

export interface PlanObjective {
  id: string;
  title: string;
  notes?: string;
  period: string;
  periodKey: string;
  status: string;
  weightPct: number;
  order: number;
  archivedAt?: number;
  mangoKey?: string;
  mangoObjectiveId?: string;
}

export interface PlanTodo {
  id: string;
  objectiveId: string;
  parentId?: string;
  path: string[];
  title: string;
  notes?: string;
  status: string;
  estimateMinutes?: number;
  order: number;
  todayDate?: string;
  deferUntil?: string;
  archivedAt?: number;
  archiveRootId?: string;
}

export interface Plan {
  objectives: PlanObjective[];
  todos: PlanTodo[];
}

export type ObjectiveFields = Partial<Omit<PlanObjective, "id">>;
export type TodoFields = Partial<Omit<PlanTodo, "id">>;

export type Change =
  | { kind: "insertObjective"; tempId: string; fields: Omit<PlanObjective, "id"> }
  | { kind: "insertTodo"; tempId: string; fields: Omit<PlanTodo, "id"> }
  | { kind: "patchObjective"; id: string; before: ObjectiveFields; after: ObjectiveFields }
  | { kind: "patchTodo"; id: string; before: TodoFields; after: TodoFields };

export interface RejectedOp {
  op: unknown;
  reason: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// --- Ordering ---------------------------------------------------------------

/** Siblings of `parentId` under `objectiveId`, live (non-archived), in order. */
export function siblingsOf(
  plan: Plan,
  objectiveId: string,
  parentId: string | undefined,
  excludeId?: string,
): PlanTodo[] {
  return plan.todos
    .filter(
      (t) =>
        t.objectiveId === objectiveId &&
        (t.parentId ?? undefined) === (parentId ?? undefined) &&
        t.archivedAt === undefined &&
        t.id !== excludeId,
    )
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/**
 * Where does a node land, given the sibling it should follow (or precede)?
 * Returns the new order key plus any sibling renumbering the insert forced.
 */
export function computeOrder(
  siblings: PlanTodo[],
  afterId: string | null | undefined,
  beforeId?: string | null,
): { order: number; renumber: Array<{ id: string; order: number }> } {
  // Explicit "put it before X" resolves to "put it after X's predecessor".
  if (beforeId !== undefined && beforeId !== null) {
    const idx = siblings.findIndex((s) => s.id === beforeId);
    if (idx >= 0) {
      const prev = idx === 0 ? null : siblings[idx - 1].id;
      return computeOrder(siblings, prev);
    }
  }

  if (siblings.length === 0) return { order: ORDER_STEP, renumber: [] };

  // afterId === null means "first"; undefined means "append".
  if (afterId === null) {
    const first = siblings[0].order;
    const candidate = first - ORDER_STEP;
    // Nothing below to collide with, so no gap check is needed.
    return { order: candidate, renumber: [] };
  }

  if (afterId === undefined) {
    return { order: siblings[siblings.length - 1].order + ORDER_STEP, renumber: [] };
  }

  const idx = siblings.findIndex((s) => s.id === afterId);
  if (idx === -1) {
    // Unknown anchor: append rather than fail — the caller already validated
    // that the ids exist, so this is only reachable for a sibling in another
    // list, where appending is the sane reading of "put it after that".
    return { order: siblings[siblings.length - 1].order + ORDER_STEP, renumber: [] };
  }
  if (idx === siblings.length - 1) {
    return { order: siblings[idx].order + ORDER_STEP, renumber: [] };
  }

  const lo = siblings[idx].order;
  const hi = siblings[idx + 1].order;
  if (hi - lo >= ORDER_MIN_GAP) {
    return { order: (lo + hi) / 2, renumber: [] };
  }

  // Gap exhausted: renumber this sibling list onto a clean grid, then insert.
  const renumber = siblings.map((s, i) => ({ id: s.id, order: (i + 1) * ORDER_STEP }));
  const loAfter = renumber[idx].order;
  const hiAfter = renumber[idx + 1].order;
  return { order: (loAfter + hiAfter) / 2, renumber };
}

// --- Weights ----------------------------------------------------------------

/**
 * Set one objective's weight and rescale its active peers so the period sums to
 * 100. "Put more time into rock 1" is inherently zero-sum; making the operator
 * hand-balance four numbers is the opposite of minimal.
 *
 * Largest-remainder rounding, so the result lands on exactly 100.
 */
export function rebalanceWeights(
  objectives: PlanObjective[],
  targetId: string,
  targetPct: number,
): Map<string, number> {
  const clamped = Math.max(0, Math.min(100, Math.round(targetPct)));
  const result = new Map<string, number>();
  result.set(targetId, clamped);

  const peers = objectives.filter((o) => o.id !== targetId);
  if (peers.length === 0) {
    result.set(targetId, 100);
    return result;
  }

  const remaining = 100 - clamped;
  const peerTotal = peers.reduce((sum, o) => sum + o.weightPct, 0);

  // Exact shares first, then hand out the rounding remainder largest-first.
  const exact = peers.map((o) => ({
    id: o.id,
    value:
      peerTotal > 0 ? (o.weightPct / peerTotal) * remaining : remaining / peers.length,
  }));
  const floors = exact.map((e) => ({ id: e.id, floor: Math.floor(e.value), rem: e.value - Math.floor(e.value) }));
  let leftover = remaining - floors.reduce((sum, f) => sum + f.floor, 0);
  floors.sort((a, b) => b.rem - a.rem || a.id.localeCompare(b.id));
  for (const f of floors) {
    const bonus = leftover > 0 ? 1 : 0;
    leftover -= bonus;
    result.set(f.id, f.floor + bonus);
  }
  return result;
}

// --- Validation -------------------------------------------------------------

/**
 * Check ops against the live plan. Returns the ops worth simulating plus the
 * ones refused and why — a refused op is itself a signal (it means the model is
 * misreading the schema, or wants something nearly-but-not-quite expressible),
 * so the reason string is recorded rather than discarded.
 */
export function validateOps(
  plan: Plan,
  ops: unknown[],
): { valid: ReorgOp[]; rejected: RejectedOp[] } {
  const valid: ReorgOp[] = [];
  const rejected: RejectedOp[] = [];

  const objectiveIds = new Set(plan.objectives.map((o) => o.id));
  const todoById = new Map(plan.todos.map((t) => [t.id, t]));
  // Ids introduced by earlier create ops in the same batch.
  const tempObjectives = new Set<string>();
  const tempTodos = new Set<string>();

  const knownObjective = (id: string) => objectiveIds.has(id) || tempObjectives.has(id);
  const knownTodo = (id: string) => todoById.has(id) || tempTodos.has(id);

  for (const raw of ops) {
    const reason = ((): string | null => {
      if (!raw || typeof raw !== "object") return "Not an object";
      const op = raw as Record<string, unknown>;
      const title = typeof op.title === "string" ? op.title.trim() : "";

      switch (op.op) {
        case "createObjective": {
          if (typeof op.tempId !== "string" || !op.tempId) return "Missing tempId";
          if (!title) return "Objective title is empty";
          if (!PERIODS.includes(op.period as Period)) return `Unknown period "${String(op.period)}"`;
          if (typeof op.periodKey !== "string" || !op.periodKey) return "Missing periodKey";
          if (op.weightPct !== undefined && (typeof op.weightPct !== "number" || op.weightPct < 0 || op.weightPct > 100))
            return "weightPct must be 0-100";
          tempObjectives.add(op.tempId);
          return null;
        }
        case "setObjectiveStatus": {
          if (typeof op.objectiveId !== "string" || !knownObjective(op.objectiveId))
            return `Unknown objective "${String(op.objectiveId)}"`;
          if (!OBJECTIVE_STATUSES.includes(op.status as ObjectiveStatus))
            return `Unknown objective status "${String(op.status)}"`;
          return null;
        }
        case "setObjectiveWeight": {
          if (typeof op.objectiveId !== "string" || !knownObjective(op.objectiveId))
            return `Unknown objective "${String(op.objectiveId)}"`;
          if (typeof op.weightPct !== "number" || op.weightPct < 0 || op.weightPct > 100)
            return "weightPct must be 0-100";
          return null;
        }
        case "createTodo": {
          if (typeof op.tempId !== "string" || !op.tempId) return "Missing tempId";
          if (!title) return "To-do title is empty";
          if (typeof op.objectiveId !== "string" || !knownObjective(op.objectiveId))
            return `Unknown objective "${String(op.objectiveId)}"`;
          if (op.parentId !== undefined && op.parentId !== null) {
            if (typeof op.parentId !== "string" || !knownTodo(op.parentId))
              return `Unknown parent "${String(op.parentId)}"`;
            const parent = todoById.get(op.parentId);
            if (parent && parent.path.length + 1 >= MAX_DEPTH)
              return `Nesting deeper than ${MAX_DEPTH} levels`;
          }
          tempTodos.add(op.tempId);
          return null;
        }
        case "moveTodo": {
          if (typeof op.todoId !== "string" || !knownTodo(op.todoId))
            return `Unknown to-do "${String(op.todoId)}"`;
          if (op.newObjectiveId !== undefined && !knownObjective(String(op.newObjectiveId)))
            return `Unknown objective "${String(op.newObjectiveId)}"`;
          if (op.newParentId !== undefined && op.newParentId !== null) {
            const parentId = String(op.newParentId);
            if (!knownTodo(parentId)) return `Unknown parent "${parentId}"`;
            if (parentId === op.todoId) return "A to-do cannot be its own parent";
            const parent = todoById.get(parentId);
            // The cycle check: moving a node under its own descendant would
            // detach that whole branch from the tree.
            if (parent && parent.path.includes(op.todoId))
              return "Cannot move a to-do under its own descendant";
            const moved = todoById.get(op.todoId);
            if (parent && moved) {
              const subtreeDepth = maxSubtreeDepth(plan, moved.id);
              if (parent.path.length + 1 + subtreeDepth > MAX_DEPTH)
                return `Nesting deeper than ${MAX_DEPTH} levels`;
            }
          }
          return null;
        }
        case "setTodoStatus": {
          if (typeof op.todoId !== "string" || !knownTodo(op.todoId))
            return `Unknown to-do "${String(op.todoId)}"`;
          if (!TODO_STATUSES.includes(op.status as TodoStatus))
            return `Unknown to-do status "${String(op.status)}"`;
          return null;
        }
        case "setTodoFields": {
          if (typeof op.todoId !== "string" || !knownTodo(op.todoId))
            return `Unknown to-do "${String(op.todoId)}"`;
          if (op.title !== undefined && !title) return "To-do title is empty";
          if (
            op.estimateMinutes !== undefined &&
            op.estimateMinutes !== null &&
            (typeof op.estimateMinutes !== "number" || op.estimateMinutes < 0)
          )
            return "estimateMinutes must be >= 0";
          return null;
        }
        case "setToday": {
          if (typeof op.todoId !== "string" || !knownTodo(op.todoId))
            return `Unknown to-do "${String(op.todoId)}"`;
          if (op.date !== null && (typeof op.date !== "string" || !ISO_DATE.test(op.date)))
            return "date must be YYYY-MM-DD or null";
          return null;
        }
        case "deferTodo": {
          if (typeof op.todoId !== "string" || !knownTodo(op.todoId))
            return `Unknown to-do "${String(op.todoId)}"`;
          if (op.until !== null && (typeof op.until !== "string" || !ISO_DATE.test(op.until)))
            return "until must be YYYY-MM-DD or null";
          return null;
        }
        case "archiveSubtree": {
          if (typeof op.todoId !== "string" || !todoById.has(op.todoId))
            return `Unknown to-do "${String(op.todoId)}"`;
          if (todoById.get(op.todoId)!.archivedAt !== undefined)
            return "Already archived";
          return null;
        }
        case "restoreSubtree": {
          if (typeof op.todoId !== "string" || !todoById.has(op.todoId))
            return `Unknown to-do "${String(op.todoId)}"`;
          if (todoById.get(op.todoId)!.archiveRootId !== op.todoId)
            return "Not the root of an archived subtree";
          return null;
        }
        case "splitTodo": {
          if (typeof op.todoId !== "string" || !knownTodo(op.todoId))
            return `Unknown to-do "${String(op.todoId)}"`;
          if (!Array.isArray(op.intoTitles) || op.intoTitles.length < 2)
            return "splitTodo needs at least two titles";
          if (op.intoTitles.some((t) => typeof t !== "string" || !t.trim()))
            return "splitTodo titles must be non-empty";
          const node = todoById.get(op.todoId);
          if (node && node.path.length + 1 >= MAX_DEPTH)
            return `Nesting deeper than ${MAX_DEPTH} levels`;
          return null;
        }
        default:
          return `Unknown op "${String(op.op)}"`;
      }
    })();

    if (reason === null) valid.push(raw as ReorgOp);
    else rejected.push({ op: raw, reason });
  }

  return { valid, rejected };
}

/** Deepest level below `rootId`, in edges (0 when the node is a leaf). */
export function maxSubtreeDepth(plan: Plan, rootId: string): number {
  const root = plan.todos.find((t) => t.id === rootId);
  if (!root) return 0;
  let deepest = 0;
  for (const node of plan.todos) {
    if (node.path.includes(rootId)) {
      deepest = Math.max(deepest, node.path.length - root.path.length);
    }
  }
  return deepest;
}

/** A node and all of its descendants, the node first. */
export function subtreeOf(plan: Plan, rootId: string): PlanTodo[] {
  const root = plan.todos.find((t) => t.id === rootId);
  if (!root) return [];
  return [root, ...plan.todos.filter((t) => t.path.includes(rootId))];
}

// --- Simulation -------------------------------------------------------------

let tempCounter = 0;
/** Placeholder id for a doc created during simulation, resolved on apply. */
function nextTempId(prefix: string): string {
  tempCounter += 1;
  return `${prefix}:${tempCounter}`;
}

interface SimState {
  objectives: Map<string, PlanObjective>;
  todos: Map<string, PlanTodo>;
  /** tempId (from the op) -> simulation id */
  aliases: Map<string, string>;
  changes: Change[];
  /** simulation id -> the fields as they were before this batch touched them */
  objectiveBefore: Map<string, ObjectiveFields>;
  todoBefore: Map<string, TodoFields>;
  created: Set<string>;
}

function resolve(state: SimState, id: string): string {
  return state.aliases.get(id) ?? id;
}

function patchObjective(state: SimState, id: string, after: ObjectiveFields) {
  const current = state.objectives.get(id);
  if (!current) return;
  const before: Record<string, unknown> = {};
  const effective: Record<string, unknown> = {};
  const currentRecord = current as unknown as Record<string, unknown>;
  Object.entries(after).forEach(([key, value]) => {
    if (currentRecord[key] === value) return;
    before[key] = currentRecord[key];
    effective[key] = value;
  });
  if (Object.keys(effective).length === 0) return;

  state.objectives.set(id, { ...current, ...effective });
  if (!state.created.has(id)) {
    // Only the FIRST value seen in this batch is the revert target.
    const seen = state.objectiveBefore.get(id) ?? {};
    for (const [key, value] of Object.entries(before)) {
      if (!(key in seen)) (seen as Record<string, unknown>)[key] = value;
    }
    state.objectiveBefore.set(id, seen);
  }
  state.changes.push({
    kind: "patchObjective",
    id,
    before: before as ObjectiveFields,
    after: effective as ObjectiveFields,
  });
}

function patchTodo(state: SimState, id: string, after: TodoFields) {
  const current = state.todos.get(id);
  if (!current) return;
  const before: Record<string, unknown> = {};
  const effective: Record<string, unknown> = {};
  const currentRecord = current as unknown as Record<string, unknown>;
  Object.entries(after).forEach(([key, value]) => {
    const existing = currentRecord[key];
    const same =
      Array.isArray(existing) && Array.isArray(value)
        ? JSON.stringify(existing) === JSON.stringify(value)
        : existing === value;
    if (same) return;
    before[key] = existing;
    effective[key] = value;
  });
  if (Object.keys(effective).length === 0) return;

  state.todos.set(id, { ...current, ...effective });
  if (!state.created.has(id)) {
    const seen = state.todoBefore.get(id) ?? {};
    for (const [key, value] of Object.entries(before)) {
      if (!(key in seen)) (seen as Record<string, unknown>)[key] = value;
    }
    state.todoBefore.set(id, seen);
  }
  state.changes.push({
    kind: "patchTodo",
    id,
    before: before as TodoFields,
    after: effective as TodoFields,
  });
}

function planOf(state: SimState): Plan {
  return {
    objectives: Array.from(state.objectives.values()),
    todos: Array.from(state.todos.values()),
  };
}

function applyRenumber(state: SimState, renumber: Array<{ id: string; order: number }>) {
  for (const entry of renumber) {
    patchTodo(state, entry.id, { order: entry.order });
  }
}

/** Rewrite path (and objectiveId) for a moved node and everything under it. */
function rewriteSubtree(
  state: SimState,
  rootId: string,
  newParentId: string | undefined,
  newObjectiveId: string,
) {
  const before = state.todos.get(rootId);
  if (!before) return;
  const oldPath = before.path;
  const newPath = newParentId ? [...(state.todos.get(newParentId)?.path ?? []), newParentId] : [];

  const descendants = Array.from(state.todos.values()).filter((t) =>
    t.path.includes(rootId),
  );

  patchTodo(state, rootId, {
    parentId: newParentId,
    path: newPath,
    objectiveId: newObjectiveId,
  });

  for (const node of descendants) {
    // Everything from the moved node down keeps its shape relative to the root.
    const tail = node.path.slice(oldPath.length);
    patchTodo(state, node.id, {
      path: [...newPath, ...tail],
      objectiveId: newObjectiveId,
    });
  }
}

/**
 * Apply ops to an in-memory plan and record the resulting document changes.
 *
 * Pure: the input plan is never mutated. The `changes` array is what the preview
 * renders AND what the apply mutation executes, so the diff the operator
 * approves and the writes that land can never disagree.
 */
export function simulateOps(
  plan: Plan,
  ops: ReorgOp[],
): { plan: Plan; changes: Change[]; errors: string[] } {
  const state: SimState = {
    objectives: new Map(plan.objectives.map((o) => [o.id, { ...o }])),
    todos: new Map(plan.todos.map((t) => [t.id, { ...t, path: [...t.path] }])),
    aliases: new Map(),
    changes: [],
    objectiveBefore: new Map(),
    todoBefore: new Map(),
    created: new Set(),
  };
  const errors: string[] = [];
  const now = Date.now();

  for (const op of ops) {
    switch (op.op) {
      case "createObjective": {
        const id = nextTempId("newObjective");
        state.aliases.set(op.tempId, id);
        state.created.add(id);
        const peers = Array.from(state.objectives.values()).filter(
          (o) =>
            o.period === op.period &&
            o.periodKey === op.periodKey &&
            o.archivedAt === undefined,
        );
        const fields: Omit<PlanObjective, "id"> = {
          title: op.title.trim(),
          notes: op.notes,
          period: op.period,
          periodKey: op.periodKey,
          status: "active",
          weightPct: op.weightPct ?? 0,
          order:
            peers.length === 0
              ? ORDER_STEP
              : Math.max(...peers.map((p) => p.order)) + ORDER_STEP,
        };
        state.objectives.set(id, { id, ...fields });
        state.changes.push({ kind: "insertObjective", tempId: id, fields });
        break;
      }

      case "setObjectiveStatus": {
        patchObjective(state, resolve(state, op.objectiveId), { status: op.status });
        break;
      }

      case "setObjectiveWeight": {
        const id = resolve(state, op.objectiveId);
        const target = state.objectives.get(id);
        if (!target) break;
        const peers = Array.from(state.objectives.values()).filter(
          (o) =>
            o.period === target.period &&
            o.periodKey === target.periodKey &&
            o.status === "active" &&
            o.archivedAt === undefined,
        );
        const weights = rebalanceWeights(peers, id, op.weightPct);
        weights.forEach((weightPct, objectiveId) => {
          patchObjective(state, objectiveId, { weightPct });
        });
        break;
      }

      case "createTodo": {
        const id = nextTempId("newTodo");
        state.aliases.set(op.tempId, id);
        state.created.add(id);
        const objectiveId = resolve(state, op.objectiveId);
        const parentId =
          op.parentId === undefined || op.parentId === null
            ? undefined
            : resolve(state, op.parentId);
        const parent = parentId ? state.todos.get(parentId) : undefined;
        const siblings = siblingsOf(planOf(state), objectiveId, parentId);
        const anchor =
          op.afterTodoId === undefined || op.afterTodoId === null
            ? op.afterTodoId
            : resolve(state, op.afterTodoId);
        const { order, renumber } = computeOrder(siblings, anchor);
        applyRenumber(state, renumber);
        const fields: Omit<PlanTodo, "id"> = {
          objectiveId,
          parentId,
          path: parent ? [...parent.path, parent.id] : [],
          title: op.title.trim(),
          status: "todo",
          estimateMinutes: op.estimateMinutes,
          order,
        };
        state.todos.set(id, { id, ...fields });
        state.changes.push({ kind: "insertTodo", tempId: id, fields });
        break;
      }

      case "moveTodo": {
        const id = resolve(state, op.todoId);
        const node = state.todos.get(id);
        if (!node) break;

        const newParentId =
          op.newParentId === undefined
            ? node.parentId
            : op.newParentId === null
              ? undefined
              : resolve(state, op.newParentId);
        const newObjectiveId = op.newObjectiveId
          ? resolve(state, op.newObjectiveId)
          : newParentId
            ? (state.todos.get(newParentId)?.objectiveId ?? node.objectiveId)
            : node.objectiveId;

        // Re-check the cycle against simulated state: an earlier op in the same
        // batch may have moved the target under this node.
        const parent = newParentId ? state.todos.get(newParentId) : undefined;
        if (parent && (parent.id === id || parent.path.includes(id))) {
          errors.push(`Cannot move "${node.title}" under its own descendant`);
          break;
        }

        const changedParent =
          (newParentId ?? undefined) !== (node.parentId ?? undefined) ||
          newObjectiveId !== node.objectiveId;
        if (changedParent) {
          rewriteSubtree(state, id, newParentId, newObjectiveId);
        }

        const siblings = siblingsOf(planOf(state), newObjectiveId, newParentId, id);
        const anchorAfter =
          op.afterTodoId === undefined || op.afterTodoId === null
            ? op.afterTodoId
            : resolve(state, op.afterTodoId);
        const anchorBefore =
          op.beforeTodoId === undefined || op.beforeTodoId === null
            ? op.beforeTodoId
            : resolve(state, op.beforeTodoId);
        const { order, renumber } = computeOrder(siblings, anchorAfter, anchorBefore);
        applyRenumber(state, renumber);
        patchTodo(state, id, { order });
        break;
      }

      case "setTodoStatus": {
        patchTodo(state, resolve(state, op.todoId), { status: op.status });
        break;
      }

      case "setTodoFields": {
        const fields: TodoFields = {};
        if (op.title !== undefined) fields.title = op.title.trim();
        if (op.notes !== undefined) fields.notes = op.notes;
        if (op.estimateMinutes !== undefined)
          fields.estimateMinutes = op.estimateMinutes === null ? undefined : op.estimateMinutes;
        patchTodo(state, resolve(state, op.todoId), fields);
        break;
      }

      case "setToday": {
        patchTodo(state, resolve(state, op.todoId), {
          todayDate: op.date === null ? undefined : op.date,
        });
        break;
      }

      case "deferTodo": {
        patchTodo(state, resolve(state, op.todoId), {
          deferUntil: op.until === null ? undefined : op.until,
        });
        break;
      }

      case "archiveSubtree": {
        const id = resolve(state, op.todoId);
        for (const node of subtreeOf(planOf(state), id)) {
          if (node.archivedAt !== undefined) continue;
          patchTodo(state, node.id, { archivedAt: now, archiveRootId: id });
        }
        break;
      }

      case "restoreSubtree": {
        const id = resolve(state, op.todoId);
        // Restore exactly the nodes this archive event took, so an inner restore
        // does not resurrect an outer archive.
        for (const node of Array.from(state.todos.values())) {
          if (node.archiveRootId !== id) continue;
          patchTodo(state, node.id, { archivedAt: undefined, archiveRootId: undefined });
        }
        break;
      }

      case "splitTodo": {
        const id = resolve(state, op.todoId);
        const node = state.todos.get(id);
        if (!node) break;
        let previous: string | null | undefined = undefined;
        for (const rawTitle of op.intoTitles) {
          const childId = nextTempId("newTodo");
          state.created.add(childId);
          const siblings = siblingsOf(planOf(state), node.objectiveId, id);
          const { order, renumber } = computeOrder(siblings, previous);
          applyRenumber(state, renumber);
          const fields: Omit<PlanTodo, "id"> = {
            objectiveId: node.objectiveId,
            parentId: id,
            path: [...node.path, id],
            title: rawTitle.trim(),
            status: "todo",
            order,
          };
          state.todos.set(childId, { id: childId, ...fields });
          state.changes.push({ kind: "insertTodo", tempId: childId, fields });
          previous = childId;
        }
        break;
      }

      default: {
        // Exhaustiveness: adding an op to the union without handling it here is
        // a compile error, not a silent no-op.
        const never: never = op;
        errors.push(`Unhandled op ${JSON.stringify(never)}`);
      }
    }
  }

  return { plan: planOf(state), changes: state.changes, errors };
}

/** Collapse a change list into the per-doc deltas an undo needs. */
export function foldChanges(changes: Change[]): {
  createdObjectiveTempIds: string[];
  createdTodoTempIds: string[];
  beforeObjectives: Array<{ id: string; fields: ObjectiveFields }>;
  beforeTodos: Array<{ id: string; fields: TodoFields }>;
  docCount: number;
} {
  const createdObjectiveTempIds: string[] = [];
  const createdTodoTempIds: string[] = [];
  const created = new Set<string>();
  const beforeObjectives = new Map<string, ObjectiveFields>();
  const beforeTodos = new Map<string, TodoFields>();

  for (const change of changes) {
    if (change.kind === "insertObjective") {
      createdObjectiveTempIds.push(change.tempId);
      created.add(change.tempId);
    } else if (change.kind === "insertTodo") {
      createdTodoTempIds.push(change.tempId);
      created.add(change.tempId);
    } else if (change.kind === "patchObjective") {
      if (created.has(change.id)) continue;
      const seen = beforeObjectives.get(change.id) ?? {};
      for (const [key, value] of Object.entries(change.before)) {
        if (!(key in seen)) (seen as Record<string, unknown>)[key] = value;
      }
      beforeObjectives.set(change.id, seen);
    } else {
      if (created.has(change.id)) continue;
      const seen = beforeTodos.get(change.id) ?? {};
      for (const [key, value] of Object.entries(change.before)) {
        if (!(key in seen)) (seen as Record<string, unknown>)[key] = value;
      }
      beforeTodos.set(change.id, seen);
    }
  }

  return {
    createdObjectiveTempIds,
    createdTodoTempIds,
    beforeObjectives: Array.from(beforeObjectives).map(([id, fields]) => ({ id, fields })),
    beforeTodos: Array.from(beforeTodos).map(([id, fields]) => ({ id, fields })),
    docCount:
      createdObjectiveTempIds.length +
      createdTodoTempIds.length +
      beforeObjectives.size +
      beforeTodos.size,
  };
}
