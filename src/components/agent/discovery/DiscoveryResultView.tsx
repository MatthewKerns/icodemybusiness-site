"use client";

import { useEffect, useRef } from "react";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { DiscoverySummaryCard, type DiscoverySummary } from "./DiscoverySummaryCard";
import { DiscoveryAccountCta } from "./DiscoveryAccountCta";

export interface PublicAssessment {
  sessionId: string;
  email: string;
  name?: string;
  summary?: DiscoverySummary;
  status: string;
  emailSent: boolean;
  claimed: boolean;
}

export function bookingHref(a: { sessionId: string; email: string; name?: string }) {
  const params = new URLSearchParams({ session: a.sessionId, email: a.email });
  if (a.name) params.set("name", a.name);
  return `/book?${params.toString()}`;
}

/**
 * After submit: "generating" while the background action runs, then the
 * report and the two next steps. The assessment doc arrives reactively, so
 * no reload is needed.
 */
export function DiscoveryResultView({
  assessment,
  returnPath,
}: {
  assessment: PublicAssessment;
  returnPath: string;
}) {
  const track = useTrackEvent();
  const readyTracked = useRef(false);
  const ready = assessment.status === "ready" && !!assessment.summary;

  useEffect(() => {
    if (ready && !readyTracked.current) {
      readyTracked.current = true;
      track(
        ANALYTICS_EVENTS.DISCOVERY_REPORT_READY,
        { path: assessment.summary?.recommendedPath },
        "system"
      );
    }
  }, [ready, assessment.summary?.recommendedPath, track]);

  if (!ready) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-bg-secondary p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" aria-hidden="true" />
        <h3 className="font-display text-h3 font-semibold text-text-primary">
          Writing up what you told me
        </h3>
        <p className="max-w-md text-sm leading-relaxed text-text-muted">
          This takes a moment. It will appear here, and a copy is on its way to{" "}
          <span className="text-text-primary">{assessment.email}</span>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-accent text-xs uppercase tracking-wider text-gold">
          Your write-up
        </p>
        <h3 className="mt-2 font-display text-h2 font-semibold text-text-primary">
          Here&apos;s where you actually are
        </h3>
        <p className="mt-2 flex items-center gap-2 text-sm text-text-muted">
          <Mail className="h-4 w-4" aria-hidden="true" />
          {assessment.emailSent
            ? `A copy is in your inbox at ${assessment.email}.`
            : `A copy is on its way to ${assessment.email}.`}
        </p>
      </div>

      <DiscoverySummaryCard summary={assessment.summary!} />

      <div className="flex flex-col gap-5 rounded-xl border border-border-gold bg-bg-secondary p-6">
        <div>
          <h4 className="font-display text-h3 font-semibold text-text-primary">
            Where this goes next
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">
            One conversation. I&apos;ll have read this before we talk, so the
            call is about what I&apos;d fix first and whether I&apos;m the right
            person to fix it. The more you told the assessment, the more of
            your context I bring.
          </p>
        </div>
        <a
          href={bookingHref(assessment)}
          onClick={() =>
            track(
              ANALYTICS_EVENTS.BOOK_CALL_CLICKED,
              { placement: "discovery-result" },
              "click"
            )
          }
          className={cn(
            "group inline-flex w-fit items-center gap-2.5 rounded-md bg-gold px-6 py-3",
            "text-sm font-semibold tracking-wide text-black transition-all duration-300",
            "hover:bg-gold-light hover:shadow-[0_0_34px_-6px_rgba(212,175,55,0.55)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light"
          )}
        >
          Book an intro call
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </a>
        <DiscoveryAccountCta
          sessionId={assessment.sessionId}
          claimed={assessment.claimed}
          returnPath={returnPath}
        />
      </div>
    </div>
  );
}
