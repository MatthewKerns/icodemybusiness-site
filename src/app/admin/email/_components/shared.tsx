"use client";

import type { ReactNode } from "react";
import { ConvexError } from "convex/values";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { Verdict } from "@/lib/coldoutbound/benchmarks";

export const TABS = [
  { key: "overview", label: "Overview" },
  { key: "people", label: "People" },
  { key: "campaigns", label: "Campaigns" },
  { key: "replies", label: "Replies" },
  { key: "inboxes", label: "Inboxes" },
  { key: "sequences", label: "Sequences" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];

export const STAGES = ["new", "contacted", "replied", "interested", "booked", "won", "lost"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  contacted: "Contacted",
  replied: "Replied",
  interested: "Interested",
  booked: "Booked",
  won: "Won",
  lost: "Lost",
};

const STAGE_TINT: Record<Stage, string> = {
  new: "border-border text-text-muted",
  contacted: "border-blue/40 text-blue",
  replied: "border-blue/40 text-blue",
  interested: "border-gold-dim text-gold",
  booked: "border-emerald-500/40 text-emerald-400",
  won: "border-emerald-500/60 bg-emerald-500/10 text-emerald-400",
  lost: "border-border text-text-dim",
};

export const REPLY_LABEL: Record<string, string> = {
  positive_interested: "Interested",
  positive_soft: "Wants more info",
  positive_referral: "Referred someone",
  neutral_question: "Question",
  negative_notnow: "Not now",
  negative_notfit: "Not a fit",
  negative_hostile: "Hostile",
  unsubscribe: "Unsubscribe",
  ooo: "Out of office",
  bounce: "Bounce",
  other: "Other",
};

export const INBOX_LABEL: Record<string, string> = {
  warming: "Warming",
  ready: "Ready (backup)",
  sending: "Sending",
  resting: "Resting",
  flagged: "Flagged",
  retired: "Retired",
};

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <Badge variant="outline" className={STAGE_TINT[stage]}>
      {STAGE_LABEL[stage]}
    </Badge>
  );
}

const VERDICT_DOT: Record<Verdict, string> = {
  good: "bg-emerald-400",
  ok: "bg-emerald-400/60",
  warn: "bg-gold",
  bad: "bg-error",
  wait: "bg-text-dim",
};
const VERDICT_WORD: Record<Verdict, string> = {
  good: "Good",
  ok: "Healthy",
  warn: "Watch",
  bad: "Act now",
  wait: "Too early",
};

export function VerdictDot({ verdict }: { verdict: Verdict }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
      <span className={cn("h-2 w-2 rounded-full", VERDICT_DOT[verdict])} aria-hidden />
      {VERDICT_WORD[verdict]}
    </span>
  );
}

export function fmtDate(ts: number | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ago(ts: number, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - ts) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** A rate as a percentage, or a dash when there is nothing to divide by. */
export function rate(part: number, whole: number | null | undefined): string {
  if (!whole) return "—";
  const p = (part / whole) * 100;
  return `${p >= 10 || p === 0 ? Math.round(p) : p.toFixed(1)}%`;
}

/** The message a failed mutation should show the owner. */
export function errorText(err: unknown): string {
  if (err instanceof ConvexError) {
    return typeof err.data === "string" ? err.data : "That could not be saved.";
  }
  return "That could not be saved. Try again.";
}

export function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "bad" | "warn";
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-secondary/40 p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p
        className={cn(
          "mt-1 text-2xl font-semibold tabular-nums text-text-primary",
          tone === "bad" && "text-error",
          tone === "warn" && "text-gold"
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-text-muted">{sub}</p>}
    </div>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-3 mt-8 flex flex-wrap items-end justify-between gap-2">
      <h2 className="text-lg font-semibold text-text-primary">{children}</h2>
      {aside}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-10 text-center">
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {children && <div className="mx-auto mt-1 max-w-md text-sm text-text-muted">{children}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs uppercase tracking-wide text-text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-text-dim">{hint}</span>}
    </label>
  );
}

/** A native select styled to match the inputs; keyboard and screen-reader friendly as-is. */
export function NativeSelect({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  label: string;
  className?: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-9 rounded-md border border-border bg-bg-secondary px-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-gold/50",
        className
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
