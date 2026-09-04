"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * /admin/funnel — the funnel MAP.
 *
 * Top: the constraint identifier — which step limits bookings right now and
 * why, computed by convex/funnelConstraint.ts over this deployment's own event
 * mirror with the same rule the PostHog "Key constraint" tile uses.
 * Below: the VISION — how the funnel is supposed to work, step by step, with the
 * event that proves each step and the two steps nothing records.
 * PostHog (dashboard 933266) is the authoritative REALITY; this page links to it.
 * Owner-only via the /admin middleware gate + requireOwner in the query.
 */

const POSTHOG_PROJECT = "https://eu.posthog.com/project/206048";
const REALITY_DASHBOARD = `${POSTHOG_PROJECT}/dashboard/933266`;
const OVERVIEW_DASHBOARD = `${POSTHOG_PROJECT}/dashboard/761841`;
const APEX_HOST = "icodemybusiness.com";
const WINDOWS = [7, 30, 90] as const;

type StepKey =
  | "arrived"
  | "splash_entered"
  | "assessment_started"
  | "answering"
  | "recap"
  | "email"
  | "book_click"
  | "booked";

interface VisionStep {
  key: StepKey;
  title: string;
  /** What the visitor sees or does. */
  visitor: string;
  /** What the step is supposed to accomplish for them. */
  purpose: string;
  /** The event that proves it happened, or null when nothing records it. */
  event: string | null;
  note?: string;
}

const STEPS: VisionStep[] = [
  {
    key: "arrived",
    title: "Arrive",
    visitor: "Lands on / (or /consulting, /book, /free-tools).",
    purpose:
      "Get a real person in front of the letter. Until the apex domain points here, this step is the constraint by definition.",
    event: "$pageview",
    note: "Counted as views, not people. PostHog breaks this down by $host to tell real visitors from staging.",
  },
  {
    key: "splash_entered",
    title: "Pass the splash",
    visitor: "Reads the three lines, clicks Start Now.",
    purpose: "Earn the first click with a promise specific enough to be worth a scroll.",
    event: ANALYTICS_EVENTS.SPLASH_ENTERED,
  },
  {
    key: "assessment_started",
    title: "Start the assessment",
    visitor: "Clicks 'Assess where you are now'; chooses account, sign-in, or guest.",
    purpose: "Move from reading to answering. The write-up is free either way, so the ask is time, not money.",
    event: ANALYTICS_EVENTS.ASSESSMENT_STARTED,
    note: `Account choice is ${ANALYTICS_EVENTS.ASSESSMENT_ACCOUNT_CHOICE}.`,
  },
  {
    key: "answering",
    title: "Answer the five questions",
    visitor: "A short conversation; at most two follow-ups per question.",
    purpose: "Surface the one thing costing them the most, in their own words.",
    event: ANALYTICS_EVENTS.DISCOVERY_STAGE_ADVANCED,
    note: "stage 1–5 property.",
  },
  {
    key: "recap",
    title: "Reach and confirm the recap",
    visitor: "Sees their answers played back; says 'Yes, that's right' or corrects one.",
    purpose: "Proof by their own words — the strongest trust move on the site.",
    event: `${ANALYTICS_EVENTS.DISCOVERY_STAGE_ADVANCED} (stage 5)`,
    note: `Reaching it is measured. The confirm click is not: ${ANALYTICS_EVENTS.DISCOVERY_RECAP_CONFIRMED} fires on email submit for guests.`,
  },
  {
    key: "email",
    title: "Give an email",
    visitor: "Where should I send the write-up?",
    purpose: "The lead. The report is emailed whether or not a call follows.",
    event: ANALYTICS_EVENTS.DISCOVERY_ASSESSMENT_COMPLETED,
    note: `Report generation is ${ANALYTICS_EVENTS.DISCOVERY_REPORT_READY}.`,
  },
  {
    key: "book_click",
    title: "Click 'Book an intro call'",
    visitor: "From the report, or from the nav on any page.",
    purpose: "Turn a read report into a calendar slot.",
    event: ANALYTICS_EVENTS.BOOK_CALL_CLICKED,
    note: "placement property tells which button.",
  },
  {
    key: "booked",
    title: "Book the call",
    visitor: "Picks a slot in the embedded Calendly (15-minute Introduction Call).",
    purpose: "The number the business runs on.",
    event: null,
    note: `${ANALYTICS_EVENTS.CONSULTATION_BOOKED} reaches PostHog from the Calendly iframe message only; nothing server-side records a booking, so this page cannot count it.`,
  },
];

const KIND_TINT: Record<string, string> = {
  traffic: "border-gold-dim text-gold",
  step: "border-error/50 text-error",
  unmeasured: "border-blue/40 text-blue",
  insufficient: "border-border text-text-muted",
};

function pct(rate: number | null | undefined): string {
  return rate === null || rate === undefined ? "—" : `${Math.round(rate * 100)}%`;
}

function day(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AdminFunnelPage() {
  const [windowDays, setWindowDays] = useState<(typeof WINDOWS)[number]>(30);
  const [host, setHost] = useState<string | null>(null);
  useEffect(() => setHost(window.location.host), []);

  const report = useQuery(api.funnelConstraint.adminFunnelConstraint, { windowDays });
  const byKey = new Map(report?.steps.map((s) => [s.key, s]) ?? []);
  const transitionTo = new Map(report?.transitions.map((t) => [t.to, t]) ?? []);
  const offApex = host !== null && host !== APEX_HOST && host !== `www.${APEX_HOST}`;

  return (
    <main className="min-h-screen bg-bg-primary p-6 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Funnel map</h1>
            <p className="mt-1 max-w-2xl text-sm text-text-muted">
              Which step limits bookings right now, and how the funnel is supposed to work.
              The authoritative reality — every visitor, every event — is in PostHog.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-sm">
            <a
              href={REALITY_DASHBOARD}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-gold px-3 py-1.5 font-medium text-bg-primary hover:bg-gold/90"
            >
              Open the reality in PostHog →
            </a>
            <a href={OVERVIEW_DASHBOARD} target="_blank" rel="noreferrer" className="text-text-muted hover:text-gold">
              Site overview dashboard
            </a>
            <Link href="/admin/events" className="text-text-muted hover:text-gold">
              Raw visitor events (Convex)
            </Link>
          </div>
        </div>

        {/* Constraint identifier */}
        <Card className="mt-6 border-gold-dim">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Constraint identifier
                </span>
                {report && (
                  <Badge variant="outline" className={KIND_TINT[report.constraint.kind]}>
                    {report.constraint.kind}
                  </Badge>
                )}
              </div>
              <div className="flex gap-1">
                {WINDOWS.map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={windowDays === d ? "default" : "outline"}
                    onClick={() => setWindowDays(d)}
                  >
                    {d}d
                  </Button>
                ))}
              </div>
            </div>
            <CardTitle className="mt-2 text-xl text-text-primary">
              {report ? report.constraint.title : "Computing…"}
            </CardTitle>
            {report && (
              <CardDescription>
                {day(report.window.since)} – {day(report.window.until)} · {report.sampled.events}{" "}
                events, {report.sampled.pageViews} page views read from this deployment&apos;s
                Convex mirror{report.sampled.truncated ? " (capped)" : ""}
              </CardDescription>
            )}
          </CardHeader>
          {report && (
            <CardContent>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Why</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-primary">
                {report.constraint.why.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
                What moves it
              </p>
              <p className="mt-1 text-sm text-text-primary">{report.constraint.nextAction}</p>
              {offApex && (
                <p className="mt-4 rounded-md border border-gold-dim bg-gold/5 px-3 py-2 text-xs text-text-muted">
                  You are reading <code className="text-gold">{host}</code>. Convex cannot tell
                  which host a view came from, so these counts include staging and localhost;
                  the PostHog tile counts only {APEX_HOST}.
                </p>
              )}
              <p className="mt-3 text-xs text-text-muted">
                Rule: under 50 page views, traffic is the constraint and nothing below can be
                judged. Otherwise it is the transition that loses the most people among those
                with at least 20 entrants and both sides measured. A step nothing records can
                never be blamed.
              </p>
            </CardContent>
          )}
        </Card>

        {/* Vision map, annotated with this window's counts */}
        <h2 className="mt-10 text-lg font-semibold text-text-primary">How it is supposed to work</h2>
        <ol className="mt-4 space-y-0">
          {STEPS.map((s, i) => {
            const count = byKey.get(s.key);
            const t = transitionTo.get(s.key);
            const isConstraint = report?.constraint.stepKey === s.key;
            return (
              <li key={s.key} className="relative flex gap-4">
                <div className="flex flex-col items-center">
                  <div
                    className={
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold " +
                      (isConstraint
                        ? "border-gold bg-gold text-bg-primary"
                        : s.event
                          ? "border-gold-dim bg-bg-secondary text-gold"
                          : "border-border bg-bg-secondary text-text-muted")
                    }
                  >
                    {i + 1}
                  </div>
                  {i < STEPS.length - 1 && <div className="w-px flex-1 bg-border" aria-hidden />}
                </div>
                <div
                  className={
                    "mb-6 flex-1 rounded-lg border p-4 " +
                    (isConstraint ? "border-gold bg-gold/5" : "border-border bg-bg-secondary/40")
                  }
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-text-primary">
                      {s.title}
                      {isConstraint && (
                        <Badge variant="outline" className="ml-2 border-gold-dim text-gold">
                          constraint
                        </Badge>
                      )}
                    </h3>
                    <div className="flex items-center gap-3 text-xs">
                      {count && count.measured ? (
                        <span className="tabular-nums text-text-primary">
                          <strong>{count.n}</strong>
                          {t && <span className="text-text-muted"> · {pct(t.rate)} of previous</span>}
                        </span>
                      ) : (
                        <span className="text-text-muted">not counted here</span>
                      )}
                      {s.event ? (
                        <code className="rounded bg-bg-tertiary px-2 py-0.5 text-gold">{s.event}</code>
                      ) : (
                        <span className="rounded border border-border px-2 py-0.5 text-text-muted">
                          unmeasured
                        </span>
                      )}
                    </div>
                  </div>
                  <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">Visitor</dt>
                      <dd className="text-text-primary">{s.visitor}</dd>
                    </div>
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-text-muted">Supposed to</dt>
                      <dd className="text-text-primary">{s.purpose}</dd>
                    </div>
                  </dl>
                  {s.note && <p className="mt-2 text-xs text-text-muted">{s.note}</p>}
                  {t?.excluded && (
                    <p className="mt-1 text-xs text-text-muted">Not a constraint candidate: {t.excluded}.</p>
                  )}
                  {count?.firstSeenAt !== undefined && report && count.firstSeenAt > report.window.since && (
                    <p className="mt-1 text-xs text-text-muted">First recorded {day(count.firstSeenAt)}.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>

        {report && report.gaps.length > 0 && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base text-text-primary">Measurement gaps</CardTitle>
              <CardDescription>What this page cannot see, and therefore cannot blame.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-5 text-sm text-text-muted">
                {report.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
