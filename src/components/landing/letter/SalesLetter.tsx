import { Check, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { CtaBand } from "./CtaBand";
import {
  PROBLEM,
  STORY,
  PATHS,
  OBJECTIONS,
  GUARANTEE,
  CTA,
} from "@/content/landing";

/**
 * The body of the letter, in VSL order: problem → who I am → which path is you
 * → objections → risk reversal → close.
 *
 * A CTA recurs after each beat rather than only at the end, so a reader who is
 * convinced early doesn't have to scroll past the rest to act. Copy lives in
 * src/content/landing.ts.
 */

function Beat({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("py-14 md:py-20", className)}>
      <div className="mx-auto max-w-3xl">{children}</div>
    </section>
  );
}

function BeatHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-h2 font-display font-semibold text-text-primary">
      {children}
    </h2>
  );
}

/** Body copy sized for sustained reading rather than scanning. */
function Prose({ paragraphs }: { paragraphs: string[] }) {
  return (
    <div className="mt-6 space-y-5">
      {paragraphs.map((p) => (
        <p key={p.slice(0, 40)} className="text-lg leading-relaxed text-text-muted">
          {p}
        </p>
      ))}
    </div>
  );
}

export function SalesLetter() {
  return (
    <>
      <Beat>
        <BeatHeading>{PROBLEM.heading}</BeatHeading>
        <Prose paragraphs={PROBLEM.body} />
      </Beat>

      <Beat>
        <BeatHeading>{STORY.heading}</BeatHeading>
        <Prose paragraphs={STORY.body} />

        <ul className="mt-10 space-y-5">
          {STORY.proofPoints.map((point) => (
            <li key={point.label} className="flex gap-3.5">
              <Check
                className="mt-1 h-5 w-5 flex-none text-gold"
                aria-hidden="true"
              />
              <div>
                <p className="font-semibold text-text-primary">{point.label}</p>
                <p className="mt-1 leading-relaxed text-text-muted">
                  {point.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <CtaBand placement="after-story" variant="inline" />
      </Beat>

      {/* The four routes in. Framed as a diagnosis so the reader's own
          situation picks the path, rather than as a menu to choose from. */}
      <section className="py-14 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-3xl">
            <BeatHeading>Which one is you?</BeatHeading>
            <p className="mt-6 text-lg leading-relaxed text-text-muted">
              There are four ways people end up working with me. They differ in
              depth and in how much of the business they touch — but they all
              begin the same way, with one conversation.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {PATHS.map((path) => (
              <article
                key={path.key}
                className={cn(
                  "flex flex-col rounded-xl border bg-bg-secondary p-7",
                  "transition-colors duration-300",
                  path.highlight
                    ? "border-gold"
                    : "border-border hover:border-gold-dim"
                )}
              >
                {path.highlight && (
                  <p className="mb-3 font-accent text-xs uppercase tracking-[0.18em] text-gold">
                    Start here
                  </p>
                )}
                <h3 className="text-h3 font-semibold text-text-primary">
                  {path.name}
                </h3>
                <p className="mt-3 font-medium leading-relaxed text-text-primary">
                  {path.forWho}
                </p>
                <p className="mt-3 leading-relaxed text-text-muted">
                  {path.what}
                </p>

                <dl className="mt-6 space-y-2.5 border-t border-border pt-5 text-sm">
                  <div className="flex gap-3">
                    <dt className="w-24 flex-none text-text-dim">Timeline</dt>
                    <dd className="text-text-muted">{path.timeline}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-24 flex-none text-text-dim">Commitment</dt>
                    <dd className="text-text-muted">{path.commitment}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CtaBand placement="after-paths" />

      <Beat>
        <BeatHeading>The questions people actually ask</BeatHeading>
        <dl className="mt-8 space-y-8">
          {OBJECTIONS.map((item) => (
            <div key={item.q}>
              <dt className="text-lg font-semibold text-text-primary">
                {item.q}
              </dt>
              <dd className="mt-2.5 text-lg leading-relaxed text-text-muted">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </Beat>

      <Beat>
        <div
          className={cn(
            "flex gap-4 rounded-xl border border-border-gold bg-bg-secondary p-7"
          )}
        >
          <ShieldCheck
            className="mt-0.5 h-6 w-6 flex-none text-gold"
            aria-hidden="true"
          />
          <div>
            <h2 className="text-h3 font-semibold text-text-primary">
              {GUARANTEE.heading}
            </h2>
            <p className="mt-2.5 text-lg leading-relaxed text-text-muted">
              {GUARANTEE.body}
            </p>
          </div>
        </div>
      </Beat>

      <Beat className="pb-4 text-center">
        <h2 className="text-h1 font-display font-semibold text-text-primary">
          {CTA.closingHeading}
        </h2>
      </Beat>
      <CtaBand placement="closing" />
    </>
  );
}
