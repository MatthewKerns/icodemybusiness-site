"use client";

import { useState } from "react";
import { Timer, Info, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { MangoSnapshots } from "./MangoStatus";

/** Shapes confirmed against the live Mango tools. */
interface TimeSummary {
  by_category?: Record<string, { hours?: number; earned?: number }>;
  by_client?: Record<string, { category?: string; hours?: number; earned?: number }>;
  total_hours?: number;
}

interface FocusProjects {
  projects?: Array<{
    key: string;
    label?: string;
    billable?: boolean;
    active?: boolean;
    weekly_min_hours?: number;
  }>;
}

interface ObjectiveHours {
  total_hours?: number;
}

const KIND = {
  thisWeek: "time_summary_this_week",
  lastWeek: "time_summary_last_week",
  focus: "focus_projects",
  overhead: "overhead_hours_7d",
};

function hoursIn(summary: TimeSummary | undefined, category: string): number {
  return summary?.by_category?.[category]?.hours ?? 0;
}

function round(value: number): string {
  return value.toFixed(1).replace(/\.0$/, "");
}

interface OverheadPanelProps {
  snapshots: MangoSnapshots | undefined;
  budgetHours: number;
  busy: boolean;
  onSetBudget: (hours: number) => Promise<void>;
}

export function OverheadPanel({
  snapshots,
  budgetHours,
  busy,
  onSetBudget,
}: OverheadPanelProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(budgetHours));

  const payload = <T,>(kind: string): T | undefined =>
    snapshots?.byKind[kind]?.payload as T | undefined;

  const thisWeek = payload<TimeSummary>(KIND.thisWeek);
  const lastWeek = payload<TimeSummary>(KIND.lastWeek);
  const focus = payload<FocusProjects>(KIND.focus);
  const overhead = payload<ObjectiveHours>(KIND.overhead);

  const stale = snapshots?.stale ?? false;
  const hasData = thisWeek !== undefined;

  const paid = hoursIn(thisWeek, "paid");
  const investment = hoursIn(thisWeek, "investment");
  const pnl = hoursIn(thisWeek, "pnl");
  const investmentLastWeek = hoursIn(lastWeek, "investment");
  const delta = investment - investmentLastWeek;

  // "personal" is deliberately excluded from the ratio: it is not business time
  // and including it would swamp the paid/unpaid signal.
  const tracked = paid + investment + pnl;
  const paidShare = tracked > 0 ? Math.round((paid / tracked) * 100) : 0;
  const budgetUsed = budgetHours > 0 ? Math.min((investment / budgetHours) * 100, 100) : 0;
  const overBudget = investment > budgetHours;
  const nearBudget = !overBudget && budgetUsed >= 80;

  const paidFloors = (focus?.projects ?? []).filter(
    (project) => project.billable && project.active !== false,
  );

  return (
    <Card className={cn(stale && "opacity-75")}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Timer className="h-4 w-4 text-gold" />
          Unpaid time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!snapshots?.configured ? (
          <p className="text-sm text-text-muted">
            Connect Mango to see where your unpaid hours are going. Set{" "}
            <code className="rounded bg-bg-tertiary px-1 py-0.5 text-xs">
              MANGO_MCP_TOKEN
            </code>{" "}
            on the Convex deployment, then hit Sync.
          </p>
        ) : !hasData ? (
          <p className="text-sm text-text-muted">
            No time data yet — hit Sync to pull this week from Mango.
          </p>
        ) : (
          <>
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-text-dim">
                  Investment hours this week
                </span>
                {editing ? (
                  <form
                    className="flex items-center gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const next = Number(draft);
                      if (Number.isFinite(next) && next >= 0 && next <= 168) {
                        void onSetBudget(next);
                      }
                      setEditing(false);
                    }}
                  >
                    <Input
                      autoFocus
                      type="number"
                      min={0}
                      max={168}
                      step={0.5}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      aria-label="Weekly unpaid-hours cap"
                      className="h-6 w-16 px-1.5 text-right text-xs"
                    />
                    <Button type="submit" size="sm" className="h-6 px-2 text-xs">
                      Set
                    </Button>
                  </form>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setDraft(String(budgetHours));
                      setEditing(true);
                    }}
                    className="font-accent text-xs text-text-dim hover:text-gold"
                  >
                    cap {round(budgetHours)}h · edit
                  </button>
                )}
              </div>

              <p
                className={cn(
                  "mt-1 font-accent text-3xl",
                  overBudget ? "text-red-400" : nearBudget ? "text-orange-400" : "text-gold",
                )}
              >
                {round(investment)}
                <span className="text-base text-text-dim">h</span>
              </p>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-tertiary">
                <div
                  className={cn(
                    "h-full transition-all",
                    overBudget ? "bg-red-500" : nearBudget ? "bg-orange-400" : "bg-gold",
                  )}
                  style={{ width: `${budgetUsed}%` }}
                />
              </div>

              <p className="mt-1.5 flex items-center gap-1 text-xs text-text-muted">
                {delta === 0 ? null : delta < 0 ? (
                  <TrendingDown className="h-3 w-3 text-emerald-400" />
                ) : (
                  <TrendingUp className="h-3 w-3 text-orange-400" />
                )}
                {delta === 0
                  ? "Level with last week"
                  : `${delta > 0 ? "+" : ""}${round(delta)}h vs last week (${round(
                      investmentLastWeek,
                    )}h)`}
              </p>
            </div>

            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wide text-text-dim">
                  Paid vs unpaid
                </span>
                <span className="font-accent text-xs text-text-muted">{paidShare}% paid</span>
              </div>
              <div
                className="flex h-2 overflow-hidden rounded-full bg-bg-tertiary"
                role="img"
                aria-label={`Paid ${round(paid)} hours, investment ${round(
                  investment,
                )} hours, own P&L ${round(pnl)} hours`}
              >
                {tracked > 0 && (
                  <>
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(paid / tracked) * 100}%` }}
                    />
                    <div
                      className="h-full bg-gold"
                      style={{ width: `${(investment / tracked) * 100}%` }}
                    />
                    <div
                      className="h-full bg-blue"
                      style={{ width: `${(pnl / tracked) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-dim">
                <span>
                  <dt className="inline">Paid</dt>{" "}
                  <dd className="inline text-emerald-400">{round(paid)}h</dd>
                </span>
                <span>
                  <dt className="inline">Investment</dt>{" "}
                  <dd className="inline text-gold">{round(investment)}h</dd>
                </span>
                <span>
                  <dt className="inline">Own P&amp;L</dt>{" "}
                  <dd className="inline text-blue">{round(pnl)}h</dd>
                </span>
              </dl>
              <p className="mt-1 text-[11px] text-text-dim">
                Personal time is excluded from this split.
              </p>
            </div>

            {overhead?.total_hours !== undefined && (
              <div className="rounded-lg bg-bg-tertiary/50 px-3 py-2">
                <p className="text-xs text-text-dim">iCMB overhead (last 7 days)</p>
                <p className="font-accent text-lg text-text-primary">
                  {round(overhead.total_hours)}h
                </p>
                <p className="mt-0.5 flex items-start gap-1 text-[11px] text-text-dim">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  From the overhead engagement, which excludes the sub-projects
                  billed elsewhere — not the same as the raw client total.
                </p>
              </div>
            )}

            {paidFloors.length > 0 && (
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-text-dim">
                  Paid weekly floors
                </p>
                <ul className="space-y-0.5">
                  {paidFloors.map((project) => (
                    <li
                      key={project.key}
                      className="flex items-baseline justify-between text-xs"
                    >
                      <span className="truncate text-text-muted">
                        {project.label ?? project.key}
                      </span>
                      <span className="shrink-0 font-accent text-text-dim">
                        {round(project.weekly_min_hours ?? 0)}h min
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
