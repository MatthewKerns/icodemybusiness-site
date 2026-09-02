"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { CTA } from "@/content/landing";

/**
 * The recurring call to action.
 *
 * VSL practice is to let the reader act the moment they're convinced rather
 * than making them scroll to the end, so this repeats after each major beat of
 * the letter. Every instance points at the same destination — the intro call —
 * and carries a `placement` so we can see which beat actually does the work.
 */
export function CtaBand({
  placement,
  variant = "band",
  label,
}: {
  /** Which beat of the letter this instance sits under. */
  placement: string;
  /** `band` is the full-width card; `inline` is a quieter mid-letter link. */
  variant?: "band" | "inline";
  label?: string;
}) {
  const track = useTrackEvent();
  const text = label ?? CTA.primary;

  const onClick = () => {
    track(
      ANALYTICS_EVENTS.BOOK_CALL_CLICKED,
      { placement, variant },
      "decision"
    );
  };

  if (variant === "inline") {
    return (
      <p className="mt-8">
        <Link
          href="/book"
          onClick={onClick}
          className={cn(
            "group inline-flex items-center gap-2 text-base font-medium text-gold",
            "underline-offset-4 transition-colors duration-300 hover:text-gold-light hover:underline",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
          )}
        >
          {text}
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </p>
    );
  }

  return (
    <div className="my-16 md:my-20">
      <div
        className={cn(
          "mx-auto flex max-w-3xl flex-col items-center gap-5 rounded-xl border border-border-gold",
          "bg-bg-secondary px-7 py-10 text-center"
        )}
      >
        <p className="max-w-lg text-lg leading-relaxed text-text-muted">
          {CTA.closingBody}
        </p>
        <Link
          href="/book"
          onClick={onClick}
          className={cn(
            "group inline-flex items-center gap-2.5 rounded-md bg-gold px-8 py-4",
            "text-base font-semibold tracking-wide text-black",
            "transition-all duration-300 hover:bg-gold-light",
            "hover:shadow-[0_0_34px_-6px_rgba(212,175,55,0.55)]",
            "motion-safe:hover:-translate-y-px",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light",
            "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
          )}
        >
          {text}
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      </div>
    </div>
  );
}
