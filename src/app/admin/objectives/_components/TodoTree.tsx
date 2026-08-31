"use client";

import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  IndentIncrease,
  IndentDecrease,
  CalendarClock,
  Sun,
  Trash2,
  Plus,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  flattenTree,
  todayKey,
  TODO_STATUS_TINT,
  type Plan,
  type ReorgOp,
  type TreeRow,
} from "./plan";

const TODO_STATUSES = ["todo", "doing", "blocked", "done"] as const;

interface TodoTreeProps {
  plan: Plan;
  objectiveId: string;
  /** Every control emits ops through this one channel. */
  onApply: (ops: ReorgOp[], label: string) => Promise<void>;
  busy: boolean;
}

export function TodoTree({ plan, objectiveId, onApply, busy }: TodoTreeProps) {
  const rows = flattenTree(plan.todos, objectiveId);
  const [draftTitle, setDraftTitle] = useState("");
  const [addingUnder, setAddingUnder] = useState<string | null>(null);
  const [childTitle, setChildTitle] = useState("");

  const addTopLevel = async () => {
    const title = draftTitle.trim();
    if (!title) return;
    setDraftTitle("");
    await onApply(
      [{ op: "createTodo", tempId: "t:new", objectiveId, title }],
      `Add "${title}"`,
    );
  };

  const addChild = async (parentId: string) => {
    const title = childTitle.trim();
    if (!title) return;
    setChildTitle("");
    setAddingUnder(null);
    await onApply(
      [{ op: "createTodo", tempId: "t:new", objectiveId, parentId, title }],
      `Add "${title}"`,
    );
  };

  return (
    <div className="space-y-2">
      {rows.length === 0 && (
        <p className="py-6 text-center text-sm text-text-muted">
          No to-dos under this objective yet.
        </p>
      )}

      <ul className="space-y-1">
        {rows.map((row) => (
          <TodoRow
            key={row.todo.id}
            row={row}
            rows={rows}
            busy={busy}
            onApply={onApply}
            isAddingChild={addingUnder === row.todo.id}
            onToggleAddChild={() => {
              setChildTitle("");
              setAddingUnder(addingUnder === row.todo.id ? null : row.todo.id);
            }}
            childTitle={childTitle}
            setChildTitle={setChildTitle}
            onSubmitChild={() => void addChild(row.todo.id)}
          />
        ))}
      </ul>

      <form
        className="flex gap-2 pt-2"
        onSubmit={(e) => {
          e.preventDefault();
          void addTopLevel();
        }}
      >
        <Input
          value={draftTitle}
          onChange={(e) => setDraftTitle(e.target.value)}
          placeholder="Add a to-do…"
          aria-label="New to-do title"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !draftTitle.trim()} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>
    </div>
  );
}

interface TodoRowProps {
  row: TreeRow;
  rows: TreeRow[];
  busy: boolean;
  onApply: (ops: ReorgOp[], label: string) => Promise<void>;
  isAddingChild: boolean;
  onToggleAddChild: () => void;
  childTitle: string;
  setChildTitle: (value: string) => void;
  onSubmitChild: () => void;
}

function TodoRow({
  row,
  rows,
  busy,
  onApply,
  isAddingChild,
  onToggleAddChild,
  childTitle,
  setChildTitle,
  onSubmitChild,
}: TodoRowProps) {
  const { todo, depth, index, siblingCount, previousSiblingId } = row;

  const siblings = rows.filter(
    (r) => (r.todo.parentId ?? undefined) === (todo.parentId ?? undefined),
  );
  const nextSibling = siblings[index + 1]?.todo;
  const previousPreviousSibling = siblings[index - 2]?.todo;

  const move = (ops: ReorgOp[], label: string) => () => void onApply(ops, label);

  // Outdent re-parents to the grandparent, landing directly after the old parent.
  const parentRow = rows.find((r) => r.todo.id === todo.parentId);
  const grandparentId = parentRow?.todo.parentId;

  return (
    <li>
      <div
        className={cn(
          "group flex items-center gap-2 rounded-lg border border-border/60 bg-bg-secondary/50 px-2 py-1.5",
          "transition-colors hover:border-gold-dim/50",
          todo.status === "done" && "opacity-60",
        )}
        style={{ marginLeft: `${depth * 1.25}rem` }}
      >
        <button
          type="button"
          aria-label={todo.status === "done" ? "Mark as not done" : "Mark as done"}
          disabled={busy}
          onClick={move(
            [
              {
                op: "setTodoStatus",
                todoId: todo.id,
                status: todo.status === "done" ? "todo" : "done",
              },
            ],
            `Complete "${todo.title}"`,
          )}
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
            todo.status === "done"
              ? "border-emerald-500/60 bg-emerald-500/20 text-emerald-400"
              : "border-border text-transparent hover:border-gold-dim",
          )}
        >
          <Check className="h-3 w-3" />
        </button>

        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm text-text-primary",
            todo.status === "done" && "line-through",
          )}
          title={todo.title}
        >
          {todo.title}
        </span>

        {todo.todayDate === todayKey() && (
          <Badge className="shrink-0 border-gold-dim text-gold" variant="outline">
            Today
          </Badge>
        )}
        {todo.deferUntil && (
          <Badge variant="outline" className="shrink-0 border-border text-text-dim">
            {todo.deferUntil}
          </Badge>
        )}

        <Select
          value={todo.status}
          disabled={busy}
          onValueChange={(status) =>
            void onApply(
              [{ op: "setTodoStatus", todoId: todo.id, status }],
              `Set "${todo.title}" to ${status}`,
            )
          }
        >
          <SelectTrigger
            className={cn("h-7 w-[104px] shrink-0 text-xs", TODO_STATUS_TINT[todo.status])}
            aria-label={`Status of ${todo.title}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TODO_STATUSES.map((status) => (
              <SelectItem key={status} value={status} className="text-xs">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <IconButton
            label={`Move "${todo.title}" up`}
            disabled={busy || index === 0}
            onClick={move(
              [
                {
                  op: "moveTodo",
                  todoId: todo.id,
                  afterTodoId: previousPreviousSibling?.id ?? null,
                },
              ],
              `Move "${todo.title}" up`,
            )}
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label={`Move "${todo.title}" down`}
            disabled={busy || index >= siblingCount - 1}
            onClick={move(
              [{ op: "moveTodo", todoId: todo.id, afterTodoId: nextSibling?.id }],
              `Move "${todo.title}" down`,
            )}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label={`Indent "${todo.title}"`}
            disabled={busy || !previousSiblingId}
            onClick={move(
              [{ op: "moveTodo", todoId: todo.id, newParentId: previousSiblingId }],
              `Indent "${todo.title}"`,
            )}
          >
            <IndentIncrease className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label={`Outdent "${todo.title}"`}
            disabled={busy || depth === 0}
            onClick={move(
              [
                {
                  op: "moveTodo",
                  todoId: todo.id,
                  newParentId: grandparentId ?? null,
                  afterTodoId: todo.parentId,
                },
              ],
              `Outdent "${todo.title}"`,
            )}
          >
            <IndentDecrease className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label={
              todo.todayDate === todayKey()
                ? `Unpin "${todo.title}" from today`
                : `Pin "${todo.title}" to today`
            }
            active={todo.todayDate === todayKey()}
            disabled={busy}
            onClick={move(
              [
                {
                  op: "setToday",
                  todoId: todo.id,
                  date: todo.todayDate === todayKey() ? null : todayKey(),
                },
              ],
              `Today: "${todo.title}"`,
            )}
          >
            <Sun className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label={`Defer "${todo.title}" to tomorrow`}
            disabled={busy}
            onClick={move(
              [
                {
                  op: "deferTodo",
                  todoId: todo.id,
                  until: todayKey(new Date(Date.now() + 86_400_000)),
                },
                { op: "setToday", todoId: todo.id, date: null },
              ],
              `Defer "${todo.title}"`,
            )}
          >
            <CalendarClock className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton label={`Add a step under "${todo.title}"`} disabled={busy} onClick={onToggleAddChild}>
            <Plus className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton
            label={`Erase "${todo.title}" and everything under it`}
            destructive
            disabled={busy}
            onClick={move(
              [{ op: "archiveSubtree", todoId: todo.id }],
              `Erase "${todo.title}"`,
            )}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      </div>

      {isAddingChild && (
        <form
          className="mt-1 flex gap-2"
          style={{ marginLeft: `${(depth + 1) * 1.25}rem` }}
          onSubmit={(e) => {
            e.preventDefault();
            onSubmitChild();
          }}
        >
          <Input
            autoFocus
            value={childTitle}
            onChange={(e) => setChildTitle(e.target.value)}
            placeholder={`Step under "${todo.title}"…`}
            aria-label={`New step under ${todo.title}`}
            disabled={busy}
            className="h-8 text-sm"
          />
          <Button type="submit" size="sm" disabled={busy || !childTitle.trim()}>
            Add
          </Button>
        </form>
      )}
    </li>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  destructive,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded p-1 text-text-dim transition-colors",
        "hover:bg-bg-tertiary hover:text-text-primary",
        "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent",
        destructive && "hover:text-red-400",
        active && "text-gold",
      )}
    >
      {children}
    </button>
  );
}
