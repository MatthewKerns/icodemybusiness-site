"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, ClipboardList, Loader2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { DiscoverySummaryCard } from "@/components/agent/discovery/DiscoverySummaryCard";
import { bookingHref } from "@/components/agent/discovery/DiscoveryResultView";
import { cn } from "@/lib/utils";

/**
 * The visitor's own discovery reports. Only assessments bound to this account
 * are listed (identity-gated query); the internal brief is never included.
 */
export default function PortalAssessmentsPage() {
  const assessments = useQuery(api.discoveryAssessments.portalListForUser, {});

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 lg:px-8">
      <h1 className="text-h1 font-bold text-text-primary">Your assessment</h1>
      <p className="mt-2 text-text-muted">
        The write-up from your discovery assessment, in your own words.
      </p>

      {assessments === undefined && (
        <div className="mt-10 flex items-center gap-2 text-sm text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Loading…
        </div>
      )}

      {assessments && assessments.length === 0 && (
        <div className="mt-10 rounded-xl border border-border bg-bg-secondary p-8 text-center">
          <ClipboardList
            className="mx-auto h-10 w-10 text-text-dim"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-h3 font-semibold text-text-primary">
            No assessment yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            Five questions, a few minutes. You get the write-up whether or not
            we ever work together.
          </p>
          <Link
            href="/assessment"
            className={cn(
              "mt-6 inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-black",
              "transition-colors hover:bg-gold-light"
            )}
          >
            Start the assessment
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      )}

      {assessments && assessments.length > 0 && (
        <div className="mt-8 space-y-10">
          {assessments.map((a) => (
            <section key={a._id} className="space-y-4">
              <p className="text-xs text-text-dim">
                {new Date(a.createdAt).toLocaleDateString()}
                {a.status !== "ready" ? " · still writing up" : ""}
              </p>
              {a.summary ? (
                <DiscoverySummaryCard summary={a.summary} />
              ) : (
                <div className="rounded-xl border border-border bg-bg-secondary p-6 text-sm text-text-muted">
                  The write-up is still being prepared. It will appear here and
                  in your inbox.
                </div>
              )}
              <Link
                href={bookingHref(a)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-black",
                  "transition-colors hover:bg-gold-light"
                )}
              >
                Book an intro call
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
