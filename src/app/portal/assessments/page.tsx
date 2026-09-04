"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { ArrowRight, ClipboardList, Loader2, PlayCircle } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { bookingHref } from "@/lib/agent/discovery-booking";
import { setDiscoverySessionId } from "@/lib/agent/discovery-session-id";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { DISCOVERY_STAGE } from "@/content/discovery-questions";
import { cn } from "@/lib/utils";

// Agent components are reached through a dynamic import, matching the other
// pages (custom-tools, the letter): the ESLint phase rule restricts static
// imports of `@/components/agent/*` from app routes.
const DiscoverySummaryCard = dynamic(
  () =>
    import("@/components/agent/discovery/DiscoverySummaryCard").then(
      (m) => m.DiscoverySummaryCard
    ),
  { ssr: false }
);

/**
 * The visitor's own discovery reports. Only assessments bound to this account
 * are listed (identity-gated query); the internal brief is never included.
 */
export default function PortalAssessmentsPage() {
  const assessments = useQuery(api.discoveryAssessments.portalListForUser, {});
  const unfinished = useQuery(api.agentSessions.portalListUnfinished, {});
  const router = useRouter();
  const track = useTrackEvent();

  /**
   * Adopt the conversation into THIS tab, then navigate.
   *
   * The session id deliberately never goes in the URL: it is a weak bearer
   * token, and a URL would put it in history, screenshots and proxy logs. It
   * also has to be written before the push — `/assessment` reads it on mount,
   * and a route change is what gives us a fresh mount with hydration intact.
   */
  const resume = (sessionId: string, stage: number) => {
    setDiscoverySessionId(sessionId);
    track(ANALYTICS_EVENTS.DISCOVERY_SESSION_RESUMED, { stage }, "click");
    router.push("/assessment");
  };

  const nothingAtAll =
    assessments &&
    assessments.length === 0 &&
    unfinished &&
    unfinished.length === 0;

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

      {unfinished && unfinished.length > 0 && (
        <section className="mt-8">
          <h2 className="font-accent text-xs uppercase tracking-wider text-gold">
            Still in progress
          </h2>
          <ul className="mt-3 list-none space-y-3 p-0">
            {unfinished.map((u) => (
              <li key={u.sessionId}>
                <button
                  type="button"
                  onClick={() => resume(u.sessionId, u.stage)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border border-border bg-bg-secondary p-5 text-left",
                    "transition-colors hover:border-gold-dim",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light"
                  )}
                >
                  <PlayCircle
                    className="mt-0.5 h-5 w-5 flex-none text-gold"
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-base leading-relaxed text-text-primary">
                      {u.problem ?? "You started but haven't answered yet."}
                    </span>
                    <span className="mt-1 block text-xs text-text-dim">
                      {u.stage >= DISCOVERY_STAGE.RECAP
                        ? "At the recap"
                        : `Question ${u.stage + 1} of ${u.questionCount}`}
                      {" · "}
                      {new Date(u.startedAt).toLocaleDateString()}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {nothingAtAll && (
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
