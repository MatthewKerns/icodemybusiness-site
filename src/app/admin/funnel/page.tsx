import Link from "next/link";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";

/**
 * /admin/funnel — the VISION: how the funnel is supposed to work, step by step,
 * and which event proves each step happened. The REALITY (what visitors actually
 * did, and which step is the constraint right now) lives in PostHog; this page
 * only links to it. Owner-only via the /admin middleware gate.
 *
 * Keep this in step with src/lib/analytics-events.ts — every step names the
 * event that measures it, so a step with no event is visibly unmeasured.
 */

const POSTHOG_PROJECT = "https://eu.posthog.com/project/206048";
const REALITY_DASHBOARD = `${POSTHOG_PROJECT}/dashboard/933266`;
const OVERVIEW_DASHBOARD = `${POSTHOG_PROJECT}/dashboard/761841`;

interface VisionStep {
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
    title: "Arrive",
    visitor: "Lands on / (or /consulting, /book, /free-tools).",
    purpose: "Get a real person in front of the letter. Until the apex domain points here, this step is the constraint by definition.",
    event: "$pageview",
    note: "Break down by $host in PostHog to tell real visitors from staging.",
  },
  {
    title: "Pass the splash",
    visitor: "Reads the three lines, clicks Start Now.",
    purpose: "Earn the first click with a promise specific enough to be worth a scroll.",
    event: ANALYTICS_EVENTS.SPLASH_ENTERED,
  },
  {
    title: "Start the assessment",
    visitor: "Clicks 'Assess where you are now'; chooses account, sign-in, or guest.",
    purpose: "Move from reading to answering. The write-up is free either way, so the ask is time, not money.",
    event: ANALYTICS_EVENTS.ASSESSMENT_STARTED,
    note: `Account choice is ${ANALYTICS_EVENTS.ASSESSMENT_ACCOUNT_CHOICE}.`,
  },
  {
    title: "Answer the five questions",
    visitor: "A short conversation; at most two follow-ups per question.",
    purpose: "Surface the one thing costing them the most, in their own words.",
    event: ANALYTICS_EVENTS.DISCOVERY_STAGE_ADVANCED,
    note: "stage 1–5 property; stage 5 = the recap was reached.",
  },
  {
    title: "Confirm the recap",
    visitor: "Sees their answers played back; says 'Yes, that's right' or corrects one.",
    purpose: "Proof by their own words — the strongest trust move on the site.",
    event: null,
    note: `${ANALYTICS_EVENTS.DISCOVERY_RECAP_CONFIRMED} fires on email submit for guests, not on the click, so the click itself is unmeasured.`,
  },
  {
    title: "Give an email",
    visitor: "Where should I send the write-up?",
    purpose: "The lead. The report is emailed whether or not a call follows.",
    event: ANALYTICS_EVENTS.DISCOVERY_ASSESSMENT_COMPLETED,
    note: `Report generation is ${ANALYTICS_EVENTS.DISCOVERY_REPORT_READY}.`,
  },
  {
    title: "Click 'Book an intro call'",
    visitor: "From the report, or from the nav on any page.",
    purpose: "Turn a read report into a calendar slot.",
    event: ANALYTICS_EVENTS.BOOK_CALL_CLICKED,
    note: "placement property tells which button.",
  },
  {
    title: "Book the call",
    visitor: "Picks a slot in the embedded Calendly (15-minute Introduction Call).",
    purpose: "The number the business runs on.",
    event: ANALYTICS_EVENTS.CONSULTATION_BOOKED,
    note: "Client-side only, from the Calendly iframe message; there is no server-side record of a booking yet.",
  },
];

export default function AdminFunnelPage() {
  return (
    <main className="min-h-screen bg-bg-primary p-6 lg:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Funnel — the vision</h1>
            <p className="mt-1 max-w-2xl text-sm text-text-muted">
              How the site is supposed to move a visitor to a booked call, and the event
              that proves each step happened. The reality — what visitors actually did and
              which step is limiting bookings right now — is in PostHog.
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

        <section className="mt-8 rounded-lg border border-gold-dim bg-gold/5 p-4 text-sm text-text-muted">
          <p className="font-semibold text-text-primary">How the constraint is named</p>
          <p className="mt-1">
            One step limits bookings at any moment. The PostHog dashboard computes it from the
            last 30 days: fewer than 50 page views means traffic is the constraint and nothing
            below can be judged; otherwise it is the transition that loses the most people
            among those with at least 20 entrants. A step nothing records can never be blamed,
            which is why the unmeasured steps below are marked.
          </p>
        </section>

        <ol className="mt-8 space-y-0">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold " +
                    (s.event ? "border-gold-dim bg-bg-secondary text-gold" : "border-border bg-bg-secondary text-text-muted")
                  }
                >
                  {i + 1}
                </div>
                {i < STEPS.length - 1 && <div className="w-px flex-1 bg-border" aria-hidden />}
              </div>
              <div className="mb-6 flex-1 rounded-lg border border-border bg-bg-secondary/40 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-base font-semibold text-text-primary">{s.title}</h2>
                  {s.event ? (
                    <code className="rounded bg-bg-tertiary px-2 py-0.5 text-xs text-gold">{s.event}</code>
                  ) : (
                    <span className="rounded border border-border px-2 py-0.5 text-xs text-text-muted">
                      unmeasured
                    </span>
                  )}
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
              </div>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
