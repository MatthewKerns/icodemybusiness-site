import { PATHS } from "@/content/landing";

export interface DiscoverySummary {
  problem: string;
  impact: string;
  history: string;
  stakes: string;
  idealOutcome: string;
  recommendedPath: string;
  thisWeekAction: string;
}

const ROWS: { key: keyof DiscoverySummary; label: string }[] = [
  { key: "problem", label: "The problem" },
  { key: "impact", label: "What it costs" },
  { key: "history", label: "How long, and what you've tried" },
  { key: "stakes", label: "If nothing changes" },
  { key: "idealOutcome", label: "The outcome you want" },
];

/**
 * The visitor-facing report. Used on the result screen and in the portal.
 * The path card is looked up from PATHS in landing.ts, which carries no
 * price by design (docs/ROADMAP.md R-009).
 */
export function DiscoverySummaryCard({ summary }: { summary: DiscoverySummary }) {
  const path =
    PATHS.find((p) => p.key === summary.recommendedPath) ??
    PATHS.find((p) => p.key === "diagnostic")!;

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-6 md:p-8">
      <dl className="space-y-5">
        {ROWS.map((row) => (
          <div key={row.key}>
            <dt className="font-accent text-xs uppercase tracking-wider text-text-dim">
              {row.label}
            </dt>
            <dd className="mt-1 text-base leading-relaxed text-text-primary">
              {summary[row.key]}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 rounded-lg border border-border-gold bg-gold/5 p-5">
        <p className="font-accent text-xs uppercase tracking-wider text-gold">
          Where I&apos;d start
        </p>
        <h3 className="mt-2 font-display text-h3 font-semibold text-text-primary">
          {path.name}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">{path.what}</p>
        <p className="mt-2 text-xs text-text-dim">{path.timeline}</p>
      </div>

      <div className="mt-6">
        <p className="font-accent text-xs uppercase tracking-wider text-text-dim">
          One thing you can do this week
        </p>
        <p className="mt-1 text-base leading-relaxed text-text-primary">
          {summary.thisWeekAction}
        </p>
      </div>
    </div>
  );
}
