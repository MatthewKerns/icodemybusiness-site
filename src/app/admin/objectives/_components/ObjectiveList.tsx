"use client";

import { useState } from "react";
import { Plus, Archive, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  objectiveProgress,
  OBJECTIVE_STATUS_TINT,
  type Plan,
  type ReorgOp,
} from "./plan";

const OBJECTIVE_STATUSES = ["active", "blocked", "done", "dropped"] as const;

interface ObjectiveListProps {
  plan: Plan;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onApply: (ops: ReorgOp[], label: string) => Promise<void>;
  onCreate: (title: string) => Promise<void>;
  onArchive: (objectiveId: string) => Promise<void>;
  onLinkMango: (objectiveId: string) => void;
  busy: boolean;
}

export function ObjectiveList({
  plan,
  selectedId,
  onSelect,
  onApply,
  onCreate,
  onArchive,
  onLinkMango,
  busy,
}: ObjectiveListProps) {
  const [title, setTitle] = useState("");
  const objectives = [...plan.objectives].sort((a, b) => a.order - b.order);
  const activeTotal = objectives
    .filter((o) => o.status === "active")
    .reduce((sum, o) => sum + o.weightPct, 0);

  return (
    <div className="space-y-3">
      {/* One bar showing where the week's emphasis actually sits. */}
      {objectives.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wide text-text-dim">
              Emphasis this period
            </span>
            <span className="font-accent text-xs text-text-dim">{activeTotal}%</span>
          </div>
          <div
            className="flex h-2 overflow-hidden rounded-full bg-bg-tertiary"
            role="img"
            aria-label={objectives
              .filter((o) => o.status === "active")
              .map((o) => `${o.title} ${o.weightPct}%`)
              .join(", ")}
          >
            {objectives
              .filter((o) => o.status === "active" && o.weightPct > 0)
              .map((objective, i) => (
                <div
                  key={objective.id}
                  className={cn(
                    "h-full transition-all",
                    i % 3 === 0 ? "bg-gold" : i % 3 === 1 ? "bg-blue" : "bg-gold-dim",
                  )}
                  style={{ width: `${objective.weightPct}%` }}
                />
              ))}
          </div>
        </div>
      )}

      <ul className="space-y-2">
        {objectives.map((objective) => {
          const progress = objectiveProgress(plan.todos, objective.id);
          const selected = objective.id === selectedId;
          return (
            <li key={objective.id}>
              <div
                className={cn(
                  "rounded-xl border bg-bg-secondary p-3 transition-all",
                  selected
                    ? "border-gold shadow-[0_0_20px_rgba(212,175,55,0.08)]"
                    : "border-border hover:border-gold-dim",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelect(objective.id)}
                  aria-pressed={selected}
                  className="flex w-full items-start justify-between gap-2 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-text-primary">
                      {objective.title}
                    </span>
                    <span className="mt-0.5 block text-xs text-text-dim">
                      {progress.done}/{progress.total} done · {objective.periodKey}
                    </span>
                  </span>
                  <Badge
                    variant="outline"
                    className={cn("shrink-0", OBJECTIVE_STATUS_TINT[objective.status])}
                  >
                    {objective.status}
                  </Badge>
                </button>

                <div className="mt-3 flex items-center gap-2">
                  <Slider
                    value={[objective.weightPct]}
                    max={100}
                    step={5}
                    disabled={busy || objective.status !== "active"}
                    aria-label={`Time emphasis for ${objective.title}`}
                    onValueCommit={([weightPct]) =>
                      void onApply(
                        [{ op: "setObjectiveWeight", objectiveId: objective.id, weightPct }],
                        `Weight "${objective.title}" to ${weightPct}%`,
                      )
                    }
                    className="flex-1"
                  />
                  <span className="w-10 shrink-0 text-right font-accent text-xs text-text-muted">
                    {objective.weightPct}%
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <Select
                    value={objective.status}
                    disabled={busy}
                    onValueChange={(status) =>
                      void onApply(
                        [{ op: "setObjectiveStatus", objectiveId: objective.id, status }],
                        `Set "${objective.title}" to ${status}`,
                      )
                    }
                  >
                    <SelectTrigger
                      className="h-7 flex-1 text-xs"
                      aria-label={`Status of ${objective.title}`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJECTIVE_STATUSES.map((status) => (
                        <SelectItem key={status} value={status} className="text-xs">
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    title={
                      objective.mangoKey
                        ? `Linked to Mango (${objective.mangoKey})`
                        : `Link "${objective.title}" to Mango`
                    }
                    aria-label={`Link "${objective.title}" to Mango`}
                    disabled={busy}
                    onClick={() => onLinkMango(objective.id)}
                    className={cn(
                      "rounded p-1.5 transition-colors hover:bg-bg-tertiary disabled:opacity-30",
                      objective.mangoKey
                        ? "text-gold hover:text-gold"
                        : "text-text-dim hover:text-text-primary",
                    )}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title={`Archive "${objective.title}"`}
                    aria-label={`Archive "${objective.title}"`}
                    disabled={busy}
                    onClick={() => void onArchive(objective.id)}
                    className="rounded p-1.5 text-text-dim transition-colors hover:bg-bg-tertiary hover:text-red-400 disabled:opacity-30"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const next = title.trim();
          if (!next) return;
          setTitle("");
          void onCreate(next);
        }}
      >
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New objective…"
          aria-label="New objective title"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || !title.trim()} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add
        </Button>
      </form>
    </div>
  );
}
