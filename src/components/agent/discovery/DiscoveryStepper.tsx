import { cn } from "@/lib/utils";
import {
  DISCOVERY_QUESTIONS,
  DISCOVERY_STAGE,
} from "@/content/discovery-questions";

const STEPS = [
  ...DISCOVERY_QUESTIONS.map((q, i) => ({ index: i, label: q.label })),
  { index: DISCOVERY_STAGE.RECAP, label: "Recap" },
  { index: DISCOVERY_STAGE.SUBMITTED, label: "Report" },
];

/**
 * Where the visitor is in the assessment. `stage` follows the server's
 * discovery state; `reportReady` lights the last node once the report exists.
 */
export function DiscoveryStepper({
  stage,
  reportReady = false,
}: {
  stage: number;
  reportReady?: boolean;
}) {
  const effective = reportReady ? DISCOVERY_STAGE.SUBMITTED : stage;
  return (
    <ol
      aria-label="Assessment progress"
      className="flex items-center gap-1 overflow-x-auto pb-1"
    >
      {STEPS.map((step, i) => {
        const done = step.index < effective || (reportReady && step.index === effective);
        const current = !reportReady && step.index === effective;
        return (
          <li key={step.index} className="flex items-center gap-1">
            <span
              aria-current={current ? "step" : undefined}
              className={cn(
                "inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                done && "border-gold/40 bg-gold/10 text-gold",
                current && "border-gold bg-gold text-black",
                !done && !current && "border-border text-text-dim"
              )}
            >
              <span
                className={cn(
                  "inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
                  done && "bg-gold text-black",
                  current && "bg-black/20 text-black",
                  !done && !current && "bg-bg-tertiary text-text-dim"
                )}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  "h-px w-3 flex-none",
                  step.index < effective ? "bg-gold/50" : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
