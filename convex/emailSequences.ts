/**
 * Enrollment and exit: how a lead gets into a sequence and how they leave.
 *
 * The clamp here is the reason a visitor cannot end up in two sequences, cannot
 * be re-sent day 1 by a duplicate trigger, and cannot be enrolled at all
 * without a consent record.
 */

import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { validateEmail } from "./lib/validators";
import { findSuppression, hasMarketingConsent } from "./lib/suppression";
import { getTrack, TRACK_PRIORITY, type TrackKey } from "./lib/sequenceTracks";

const trackValidator = v.union(
  v.literal("assessment"),
  v.literal("free-tools"),
  v.literal("academy"),
  v.literal("post-call")
);

export type EnrollOutcome =
  | { status: "enrolled"; enrollmentId: string }
  | { status: "already-enrolled"; enrollmentId: string }
  | { status: "queued-behind"; enrollmentId: string; incumbent: TrackKey }
  | { status: "refused"; reason: "suppressed" | "no-consent" | "unknown-track" };

/**
 * Enroll an address in a track.
 *
 * Internal, not public: enrollment is a consequence of something the visitor
 * did (finished an assessment, took a tool), never something a client can ask
 * for directly. A public version would let anyone sign anyone up.
 *
 * Idempotent per (email, track). Never resets `lastStepSent` — a second
 * trigger for a track already running returns the existing row rather than
 * re-sending day 1.
 */
export const enroll = internalMutation({
  args: {
    email: v.string(),
    track: trackValidator,
    leadId: v.optional(v.id("leads")),
    assessmentId: v.optional(v.id("assessments")),
    sessionId: v.optional(v.string()),
    name: v.optional(v.string()),
    /** Start the first step immediately rather than after the step delay. */
    startAt: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<EnrollOutcome> => {
    const email = validateEmail(args.email);
    const track = getTrack(args.track);
    if (!track) return { status: "refused", reason: "unknown-track" };

    // Gate 1: suppression. A suppressed address creates NO row at all — an
    // enrollment row for someone who unsubscribed is a landmine for whoever
    // next changes the sweep query.
    if (await findSuppression(ctx, email, "marketing")) {
      return { status: "refused", reason: "suppressed" };
    }

    // Gate 2: consent. Absent means no (see lib/suppression.ts).
    if (!(await hasMarketingConsent(ctx, email))) {
      return { status: "refused", reason: "no-consent" };
    }

    const now = Date.now();
    const existingAll = await ctx.db
      .query("sequenceEnrollments")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    const sameTrack = existingAll.find((e) => e.track === args.track);
    if (sameTrack && sameTrack.status !== "exited") {
      return { status: "already-enrolled", enrollmentId: sameTrack._id };
    }

    const incumbent = existingAll.find((e) => e.status === "active");
    const myPriority = TRACK_PRIORITY[args.track];

    // A lower-priority sequence yields. Someone who just booked a call must not
    // keep receiving "here's why you should book".
    if (incumbent && TRACK_PRIORITY[incumbent.track] < myPriority) {
      await ctx.db.patch(incumbent._id, {
        status: "exited",
        exitReason: "superseded",
        exitedAt: now,
        updatedAt: now,
      });
    }

    // A higher-priority sequence wins; this one is recorded as paused so the
    // signal is visible in admin rather than silently dropped.
    const queuedBehind =
      incumbent && TRACK_PRIORITY[incumbent.track] > myPriority
        ? (incumbent.track as TrackKey)
        : null;

    const firstStep = track.steps[0];
    const nextDueAt = args.startAt ?? now + (firstStep?.delayMs ?? 0);

    const fields = {
      email,
      leadId: args.leadId,
      track: args.track,
      status: queuedBehind ? ("paused" as const) : ("active" as const),
      phase: "daily" as const,
      lastStepSent: 0,
      nextStepIndex: 0,
      nextDueAt,
      weeklyIssue: 0,
      assessmentId: args.assessmentId,
      sessionId: args.sessionId,
      name: args.name,
      failureCount: 0,
      enrolledAt: now,
      updatedAt: now,
    };

    // Re-enrolling an exited track reuses the row so history stays in one place.
    const enrollmentId = sameTrack
      ? (await ctx.db.patch(sameTrack._id, {
          ...fields,
          exitReason: undefined,
          exitedAt: undefined,
        }),
        sameTrack._id)
      : await ctx.db.insert("sequenceEnrollments", fields);

    return queuedBehind
      ? { status: "queued-behind", enrollmentId, incumbent: queuedBehind }
      : { status: "enrolled", enrollmentId };
  },
});

/**
 * Exit every nurture track for an address and, optionally, move them onto a
 * higher one. This is what a booking calls.
 */
export const exitTracks = internalMutation({
  args: {
    email: v.string(),
    reason: v.string(),
    except: v.optional(trackValidator),
  },
  handler: async (ctx, args) => {
    const email = validateEmail(args.email);
    const now = Date.now();
    const rows = await ctx.db
      .query("sequenceEnrollments")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    let exited = 0;
    for (const r of rows) {
      if (r.status === "exited") continue;
      if (args.except && r.track === args.except) continue;
      await ctx.db.patch(r._id, {
        status: "exited",
        exitReason: args.reason,
        exitedAt: now,
        updatedAt: now,
      });
      exited++;
    }
    return { email, exited };
  },
});

/** Read-side for the sweeper and for tests. */
export const listDue = internalQuery({
  args: { now: v.number(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sequenceEnrollments")
      .withIndex("by_status_nextDueAt", (q) =>
        q.eq("status", "active").lte("nextDueAt", args.now)
      )
      .take(Math.min(args.limit ?? 50, 200));
  },
});
