import { cn } from "@/lib/utils";

interface CaseStudyCardProps {
  slug: string;
  category: string;
  title: string;
  summary: string;
  metric: string;
  challenge: string;
  solution: string;
  results: string;
}

export function CaseStudyCard({
  slug,
  category,
  title,
  summary,
  metric,
  challenge,
  solution,
  results,
}: CaseStudyCardProps) {
  return (
    <article
      className={cn(
        "group flex flex-col rounded-xl border border-border bg-bg-secondary p-6 transition-all duration-300",
        "hover:border-gold-dim hover:shadow-[0_0_24px_rgba(212,175,55,0.15)]"
      )}
    >
      {/* Gradient hero placeholder */}
      <div className="mb-4 h-36 w-full rounded-lg bg-gradient-to-br from-bg-tertiary via-bg-secondary to-bg-tertiary" />

      {/* Category tag */}
      <span className="mb-2 inline-block w-fit rounded-full border border-border bg-bg-tertiary px-3 py-0.5 font-accent text-xs uppercase tracking-wider text-text-dim">
        {category}
      </span>

      <h3 className="text-h3 font-bold text-text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{summary}</p>

      {/* Metric highlight */}
      <div className="mt-4 rounded-lg border border-border-gold bg-gold/5 px-4 py-3 text-center">
        <p className="font-accent text-lg font-bold text-gold">{metric}</p>
      </div>

      {/* Challenge → Solution → Results */}
      <div className="mt-4 space-y-3">
        <div>
          <h4 className="font-accent text-xs uppercase tracking-wider text-text-dim">
            Challenge
          </h4>
          <p className="mt-1 text-sm text-text-muted">{challenge}</p>
        </div>
        <div>
          <h4 className="font-accent text-xs uppercase tracking-wider text-text-dim">
            Solution
          </h4>
          <p className="mt-1 text-sm text-text-muted">{solution}</p>
        </div>
        <div>
          <h4 className="font-accent text-xs uppercase tracking-wider text-text-dim">
            Results
          </h4>
          <p className="mt-1 text-sm text-text-muted">{results}</p>
        </div>
      </div>
    </article>
  );
}
