import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireOwner } from "./lib/auth";
import { analyzeFunnel, type StepCount, type StepKey } from "./lib/funnelConstraint";

/** Bounded scan; the site is small, and a hit on this cap is reported, not hidden. */
const MAX_ROWS = 10000;
const DAY_MS = 86_400_000;

/**
 * The funnel as it is actually written to Convex (`visitorEvents` via
 * useTrackEvent; `pageViews` via useTrackPageView). One row per step, in order.
 * `event` null means the count comes from `pageViews`. `stage` narrows
 * discovery_stage_advanced to the recap. `measured: false` documents a step the
 * taxonomy has but nothing dual-writes — it stays visible as a gap on purpose.
 */
const STEP_DEFS: ReadonlyArray<{
  key: StepKey;
  label: string;
  event: string | null;
  stage?: number;
  measured: boolean;
  source: string;
}> = [
  { key: "arrived", label: "Page views (all pages)", event: null, measured: true, source: "pageViews rows" },
  { key: "splash_entered", label: "Passed the splash", event: "splash_entered", measured: true, source: "visitorEvents splash_entered" },
  { key: "assessment_started", label: "Started the assessment", event: "assessment_started", measured: true, source: "visitorEvents assessment_started" },
  { key: "answering", label: "Answered question 1", event: "discovery_stage_advanced", measured: true, source: "visitorEvents discovery_stage_advanced (any stage)" },
  { key: "recap", label: "Reached the recap", event: "discovery_stage_advanced", stage: 5, measured: true, source: "visitorEvents discovery_stage_advanced{stage:5}" },
  { key: "email", label: "Gave an email", event: "discovery_assessment_completed", measured: true, source: "visitorEvents discovery_assessment_completed" },
  { key: "book_click", label: "Clicked book a call", event: "book_call_clicked", measured: true, source: "visitorEvents book_call_clicked (any placement)" },
  { key: "booked", label: "Booked a call", event: "consultation_booked", measured: false, source: "PostHog only — CalendlyEmbed fires it client-side, no Convex write" },
];

function stageOf(props: unknown): number | undefined {
  if (props && typeof props === "object" && "stage" in props) {
    const s = (props as { stage?: unknown }).stage;
    return typeof s === "number" ? s : undefined;
  }
  return undefined;
}

/**
 * Owner-only: the funnel over a window, with the single constraint named and the
 * numbers that name it. Authorised from the verified Clerk identity (the owner
 * allowlist in the Convex env), never from `users.role`.
 */
export const adminFunnelConstraint = query({
  args: { windowDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);

    const windowDays = Math.min(365, Math.max(1, Math.floor(args.windowDays ?? 30)));
    const until = Date.now();
    const since = until - windowDays * DAY_MS;

    const events = await ctx.db
      .query("visitorEvents")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", since))
      .take(MAX_ROWS);
    const pageViews = await ctx.db
      .query("pageViews")
      .withIndex("by_timestamp", (q) => q.gte("timestamp", since))
      .take(MAX_ROWS);

    const sessions = new Map<StepKey, Set<string>>();
    for (const d of STEP_DEFS) sessions.set(d.key, new Set());
    for (const e of events) {
      const who = e.sessionId ?? e.clerkUserId ?? `anon:${e._id}`;
      for (const d of STEP_DEFS) {
        if (d.event !== e.name) continue;
        if (d.stage !== undefined && stageOf(e.props) !== d.stage) continue;
        sessions.get(d.key)!.add(who);
      }
    }

    const firstSeen = new Map<string, number | undefined>();
    for (const d of STEP_DEFS) {
      if (d.event === null || firstSeen.has(d.event)) continue;
      const first = await ctx.db
        .query("visitorEvents")
        .withIndex("by_name", (q) => q.eq("name", d.event as string))
        .order("asc")
        .first();
      firstSeen.set(d.event, first?.timestamp);
    }

    const steps: StepCount[] = STEP_DEFS.map((d) => ({
      key: d.key,
      label: d.label,
      n: d.event === null ? pageViews.length : sessions.get(d.key)!.size,
      measured: d.measured,
      firstSeenAt: d.event === null ? undefined : firstSeen.get(d.event),
      source: d.source,
    }));

    const report = analyzeFunnel({ windowDays, since, until, steps });
    return {
      ...report,
      sampled: {
        events: events.length,
        pageViews: pageViews.length,
        truncated: events.length === MAX_ROWS || pageViews.length === MAX_ROWS,
      },
    };
  },
});
