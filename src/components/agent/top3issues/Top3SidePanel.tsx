import type { Issue } from "./types";

const severityStyle: Record<Issue["severity"], string> = {
  high: "text-red-400 border-red-500/40",
  medium: "text-amber-400 border-amber-500/40",
  low: "text-emerald-400 border-emerald-500/40",
};

export function Top3SidePanel({ issues }: { issues: Issue[] }) {
  return (
    <aside
      className="flex flex-col gap-3 rounded-xl border border-border bg-bg-secondary p-4"
      aria-label="Draft top 3 issues"
      data-testid="top3-panel"
    >
      <h3 className="text-sm font-semibold tracking-wide uppercase text-gold">
        Draft Top 3
      </h3>
      {issues.length === 0 ? (
        <p className="text-xs text-text-muted">
          As you chat, the three biggest issues we hear will appear here.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {issues.map((issue, i) => (
            <li
              key={i}
              className={`rounded-md border-l-2 bg-bg-primary px-3 py-2 ${severityStyle[issue.severity]}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-semibold text-text-primary">
                  {i + 1}. {issue.title}
                </span>
                <span className="text-[10px] uppercase tracking-wide">
                  {issue.severity}
                </span>
              </div>
              <p className="mt-1 text-xs text-text-muted">{issue.evidence}</p>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
