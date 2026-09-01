import type { ReorgOp } from "../../../../../convex/lib/objectiveOps";

export type { ReorgOp };

export interface PlanObjective {
  id: string;
  title: string;
  notes?: string;
  period: string;
  periodKey: string;
  status: string;
  weightPct: number;
  order: number;
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
}

export interface Plan {
  objectives: PlanObjective[];
  todos: PlanTodo[];
}

/** A to-do plus the derived shape the tree UI needs to render one row. */
export interface TreeRow {
  todo: PlanTodo;
  depth: number;
  /** Position among its own siblings, for enabling/disabling the move buttons. */
  index: number;
  siblingCount: number;
  /** The sibling directly above, if any — the anchor for an indent. */
  previousSiblingId?: string;
}

/** Local date as YYYY-MM-DD, matching how todayDate is stored. */
export function todayKey(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

/** ISO week key, e.g. "2026-W35". Weeks start Monday, per ISO 8601. */
export function isoWeekKey(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Thursday of the current week determines the ISO year.
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Flatten one objective's to-dos into render order: siblings by `order`, each
 * followed by its own subtree.
 */
export function flattenTree(todos: PlanTodo[], objectiveId: string): TreeRow[] {
  const scoped = todos.filter((t) => t.objectiveId === objectiveId);
  const byParent = new Map<string, PlanTodo[]>();
  for (const todo of scoped) {
    const key = todo.parentId ?? "";
    const list = byParent.get(key) ?? [];
    list.push(todo);
    byParent.set(key, list);
  }
  for (const list of Array.from(byParent.values())) {
    list.sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  }

  const rows: TreeRow[] = [];
  const walk = (parentKey: string, depth: number) => {
    const siblings = byParent.get(parentKey) ?? [];
    siblings.forEach((todo, index) => {
      rows.push({
        todo,
        depth,
        index,
        siblingCount: siblings.length,
        previousSiblingId: index > 0 ? siblings[index - 1].id : undefined,
      });
      walk(todo.id, depth + 1);
    });
  };
  walk("", 0);
  return rows;
}

/** Rolled-up counts for an objective's tile. */
export function objectiveProgress(todos: PlanTodo[], objectiveId: string) {
  const scoped = todos.filter((t) => t.objectiveId === objectiveId);
  const done = scoped.filter((t) => t.status === "done").length;
  return {
    total: scoped.length,
    done,
    pct: scoped.length === 0 ? 0 : Math.round((done / scoped.length) * 100),
  };
}

export const TODO_STATUS_TINT: Record<string, string> = {
  todo: "border-border text-text-muted",
  doing: "border-blue/40 text-blue",
  blocked: "border-orange-500/40 text-orange-400",
  done: "border-emerald-500/40 text-emerald-400",
};

export const OBJECTIVE_STATUS_TINT: Record<string, string> = {
  active: "border-gold-dim text-gold",
  blocked: "border-orange-500/40 text-orange-400",
  done: "border-emerald-500/40 text-emerald-400",
  dropped: "border-border text-text-dim",
};

/** One change rendered as a sentence, for the AI proposal diff. */
export function describeOp(
  op: ReorgOp,
  titleOf: (id: string) => string,
): { verb: string; text: string; destructive: boolean } {
  switch (op.op) {
    case "createObjective":
      return { verb: "Add objective", text: op.title, destructive: false };
    case "setObjectiveStatus":
      return {
        verb: "Objective status",
        text: `${titleOf(op.objectiveId)} -> ${op.status}`,
        destructive: op.status === "dropped",
      };
    case "setObjectiveWeight":
      return {
        verb: "Objective weight",
        text: `${titleOf(op.objectiveId)} -> ${op.weightPct}%`,
        destructive: false,
      };
    case "createTodo":
      return { verb: "Add to-do", text: op.title, destructive: false };
    case "moveTodo":
      return {
        verb: "Move",
        text: `${titleOf(op.todoId)}${
          op.newParentId ? ` under ${titleOf(op.newParentId)}` : ""
        }`,
        destructive: false,
      };
    case "setTodoStatus":
      return {
        verb: "Status",
        text: `${titleOf(op.todoId)} -> ${op.status}`,
        destructive: false,
      };
    case "setTodoFields":
      return { verb: "Edit", text: titleOf(op.todoId), destructive: false };
    case "setToday":
      return {
        verb: op.date ? "Pin to today" : "Unpin from today",
        text: titleOf(op.todoId),
        destructive: false,
      };
    case "deferTodo":
      return {
        verb: op.until ? `Defer to ${op.until}` : "Clear deferral",
        text: titleOf(op.todoId),
        destructive: false,
      };
    case "archiveSubtree":
      return { verb: "Erase subtree", text: titleOf(op.todoId), destructive: true };
    case "restoreSubtree":
      return { verb: "Restore subtree", text: titleOf(op.todoId), destructive: false };
    case "splitTodo":
      return {
        verb: "Split",
        text: `${titleOf(op.todoId)} into ${op.intoTitles.length} steps`,
        destructive: false,
      };
    default:
      return { verb: "Change", text: "", destructive: false };
  }
}
