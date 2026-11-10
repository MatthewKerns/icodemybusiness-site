import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { rateLimit } from "./lib/rateLimits";
import { requireRole } from "./lib/auth";
import { internal } from "./_generated/api";

/** `ANALYTICS_EVENTS.CONSULTATION_BOOKED` in src/lib/analytics-events.ts. */
const BOOKED_EVENT = "consultation_booked";

/**
 * Durable capture of a visitor click / decision. Public and unauthenticated —
 * anonymous visitors are the whole point — but rate-limited per session to stop
 * floods. Best-effort: when rate-limited we silently skip the insert instead of
 * throwing, so the fire-and-forget client call never surfaces an error.
 */
export const track = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    sessionId: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
    page: v.optional(v.string()),
    props: v.optional(v.any()),
    source: v.optional(v.string()),
    variant: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { ok } = await rateLimit(ctx, {
      name: "eventCapture",
      key: args.sessionId ?? args.clerkUserId ?? "anon",
    });
    if (!ok) return null;

    // A booking made in the Calendly embed is the one event that changes
    // where a lead stands. It is reported by the visitor's browser, keyed on
    // their own session id, so it can only ever mark that visitor's own lead.
    if (args.name === BOOKED_EVENT && args.sessionId) {
      const lead = await ctx.db
        .query("leads")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
        .first();
      if (lead && lead.stage !== "won" && lead.stage !== "booked") {
        await ctx.db.patch(lead._id, { stage: "booked", stageUpdatedAt: Date.now() });
        // Someone who just booked must not keep getting "here's why to book".
        await ctx.runMutation(internal.emailSequences.exitTracks, {
          email: lead.email,
          reason: "booked",
          except: "post-call",
        });
      }
    }

    return await ctx.db.insert("visitorEvents", {
      name: args.name,
      category: args.category,
      sessionId: args.sessionId,
      clerkUserId: args.clerkUserId,
      page: args.page,
      props: args.props,
      source: args.source,
      variant: args.variant,
      timestamp: Date.now(),
    });
  },
});

const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

/**
 * Admin review: the visitor-event stream, newest first. Optionally narrowed to
 * a single session (the per-visitor timeline) or a single event name. Uses the
 * matching index for the chosen filter so it stays cheap as the log grows.
 */
export const adminListEvents = query({
  args: {
    sessionId: v.optional(v.string()),
    name: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const limit = Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    if (args.sessionId !== undefined) {
      const sessionId = args.sessionId;
      // Per-session timeline reads ascending so the admin sees the journey in
      // order; cap the slice to stay bounded.
      const events = await ctx.db
        .query("visitorEvents")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
        .order("asc")
        .take(limit);
      return events;
    }

    if (args.name !== undefined) {
      const name = args.name;
      return await ctx.db
        .query("visitorEvents")
        .withIndex("by_name", (q) => q.eq("name", name))
        .order("desc")
        .take(limit);
    }

    return await ctx.db
      .query("visitorEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(limit);
  },
});

/**
 * Admin overview: a count of each captured event name across the whole log, for
 * an at-a-glance picture of which decisions/clicks are firing. Bounded scan.
 */
export const adminEventCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const events = await ctx.db
      .query("visitorEvents")
      .withIndex("by_timestamp")
      .order("desc")
      .take(MAX_LIMIT);

    const counts: Record<string, number> = {};
    for (const e of events) {
      counts[e.name] = (counts[e.name] ?? 0) + 1;
    }
    return { sampled: events.length, counts };
  },
});
