"use client";

import { Sun, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TODO_STATUS_TINT, todayKey, type Plan, type ReorgOp } from "./plan";
import { Badge } from "@/components/ui/badge";

interface TodayPanelProps {
  plan: Plan;
  onApply: (ops: ReorgOp[], label: string) => Promise<void>;
  onSelectObjective: (objectiveId: string) => void;
  busy: boolean;
}

export function TodayPanel({ plan, onApply, onSelectObjective, busy }: TodayPanelProps) {
  const today = todayKey();
  const objectiveTitle = (id: string) =>
    plan.objectives.find((o) => o.id === id)?.title ?? "—";

  // Ordered by their objective's emphasis, so the weight slider visibly drives
  // what today's list leads with.
  const weightOf = (objectiveId: string) =>
    plan.objectives.find((o) => o.id === objectiveId)?.weightPct ?? 0;

  const pinned = plan.todos
    .filter((t) => t.todayDate === today && t.status !== "done")
    .sort(
      (a, b) =>
        weightOf(b.objectiveId) - weightOf(a.objectiveId) || a.order - b.order,
    );

  const doneToday = plan.todos.filter(
    (t) => t.todayDate === today && t.status === "done",
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sun className="h-4 w-4 text-gold" />
          Today
          {pinned.length > 0 && (
            <Badge variant="outline" className="border-gold-dim text-gold">
              {pinned.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pinned.length === 0 && doneToday.length === 0 ? (
          <p className="py-4 text-sm text-text-muted">
            Nothing pinned. Use the sun icon on a to-do to target it for today.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {pinned.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-bg-secondary/50 px-2 py-1.5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-text-primary">
                    {todo.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectObjective(todo.objectiveId)}
                    className="block truncate text-xs text-text-dim hover:text-gold"
                  >
                    {objectiveTitle(todo.objectiveId)}
                  </button>
                </span>
                <Badge
                  variant="outline"
                  className={cn("shrink-0 text-xs", TODO_STATUS_TINT[todo.status])}
                >
                  {todo.status}
                </Badge>
                <button
                  type="button"
                  title={`Unpin "${todo.title}"`}
                  aria-label={`Unpin "${todo.title}" from today`}
                  disabled={busy}
                  onClick={() =>
                    void onApply(
                      [{ op: "setToday", todoId: todo.id, date: null }],
                      `Unpin "${todo.title}"`,
                    )
                  }
                  className="shrink-0 rounded p-1 text-text-dim hover:bg-bg-tertiary hover:text-text-primary disabled:opacity-30"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {doneToday.length > 0 && (
              <li className="pt-2 text-xs text-text-dim">
                {doneToday.length} finished today
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
