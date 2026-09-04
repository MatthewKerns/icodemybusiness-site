/**
 * The send loop: a cron sweeper, not a chain of scheduled sends.
 *
 * WHY A SWEEPER. Convex scheduled *actions* run at most once and permanently
 * fail on transient errors. In a chained design — step N schedules step N+1 —
 * one flaky Resend call silently terminates the whole sequence, with nothing
 * left in the queue to retry and nothing in the database saying it stopped.
 * The sweeper re-derives what is due from the database on every tick, so a
 * failed send self-heals on the next pass. Three more reasons:
 *   - `ctx.scheduler.cancel` throws once a job has completed, so unsubscribing
 *     mid-chain means storing a job id per enrollment and racing it. Here,
 *     unsubscribing is one `db.patch({ status: "exited" })`.
 *   - Pending jobs are pinned to a udf path and args shape. A five-day chain
 *     scheduled today is executed by tomorrow's code; renaming a function
 *     breaks every job in flight. Convex ships before the app here, often.
 *   - Convex caps pending scheduled functions at 1000. Enrolling a backlog is
 *     row inserts, not thousands of queued jobs.
 *
 * IDEMPOTENCY. `claimStep` writes the dedupe row and advances the cursor in
 * ONE transaction. A duplicate fan-out therefore finds both a future
 * `nextDueAt` and a `claimed` ledger row and does nothing. Convex mutations
 * are OCC transactions, so two concurrent claims serialize and the loser reads
 * the winner's write.
 */

import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { assertSendable } from "./lib/suppression";
import {
  dedupeKey,
  getTrack,
  isStepAuthored,
  stepAt,
} from "./lib/sequenceTracks";

/** How many due enrollments one sweep tick handles before re-scheduling itself. */
export const SWEEP_BATCH = 50;
/** Attempts on a single step before it is skipped. */
export const MAX_STEP_ATTEMPTS = 3;
/** Consecutive failed steps before the whole enrollment gives up. */
export const MAX_ENROLLMENT_FAILURES = 5;

function backoffMs(failureCount: number): number {
  // 15m, 1h, 4h, 12h, then a day. Bounded so a transient Resend outage does
  // not push the whole sequence weeks out.
  const ladder = [15 * 60_000, 60 * 60_000, 4 * 3_600_000, 12 * 3_600_000];
  return ladder[Math.min(failureCount, ladder.length) - 1] ?? 24 * 3_600_000;
}

/**
 * Take exclusive ownership of one step and advance the cursor, atomically.
 * Returns null when there is nothing to send — already claimed, suppressed,
 * paused, unauthored copy, or no longer due.
 */
export const claimStep = internalMutation({
  args: { enrollmentId: v.id("sequenceEnrollments") },
  handler: async (ctx, args) => {
    const now = Date.now();
    const e = await ctx.db.get(args.enrollmentId);
    if (!e) return null;
    if (e.status !== "active") return null;
    if (e.nextDueAt > now) return null;

    // The gate. Runs BEFORE any ledger write, so a suppressed address leaves
    // no trace of an attempted send — which is what the tests assert.
    const block = await assertSendable(ctx, e.email);
    if (block) {
      if (block.kind === "suppressed" || block.kind === "no-consent") {
        await ctx.db.patch(e._id, {
          status: "exited",
          exitReason:
            block.kind === "no-consent" ? "no-consent" : "suppressed",
          exitedAt: now,
          updatedAt: now,
        });
      }
      // "paused" leaves the enrollment untouched so it resumes on unpause.
      return null;
    }

    const track = getTrack(e.track);
    if (!track) return null;

    const step = stepAt(e.track, e.nextStepIndex);
    if (!step) {
      // Daily phase exhausted — hold in weekly until weekly copy exists.
      await ctx.db.patch(e._id, {
        phase: "weekly",
        nextDueAt: now + track.weeklyDelayMs,
        updatedAt: now,
      });
      return null;
    }

    // Copy that does not exist yet is a hard stop, never an empty email.
    // Every step is unauthored until Matthew answers docs/matthew-story-intake.md.
    if (!isStepAuthored(step)) {
      await ctx.db.patch(e._id, {
        nextDueAt: now + track.weeklyDelayMs,
        updatedAt: now,
      });
      return null;
    }

    const key = dedupeKey(e._id, e.track, step.key);
    const prior = await ctx.db
      .query("sequenceStepSends")
      .withIndex("by_dedupeKey", (q) => q.eq("dedupeKey", key))
      .first();

    if (prior && (prior.state === "claimed" || prior.state === "sent")) {
      return null; // In flight or already delivered.
    }
    if (prior && prior.attempts >= MAX_STEP_ATTEMPTS) {
      // Give up on this step, move to the next one rather than looping.
      await ctx.db.patch(e._id, {
        nextStepIndex: e.nextStepIndex + 1,
        nextDueAt: now + step.delayMs,
        updatedAt: now,
      });
      return null;
    }

    const sendId = prior
      ? (await ctx.db.patch(prior._id, {
          state: "claimed",
          attempts: prior.attempts + 1,
          claimedAt: now,
        }),
        prior._id)
      : await ctx.db.insert("sequenceStepSends", {
          enrollmentId: e._id,
          dedupeKey: key,
          email: e.email,
          track: e.track,
          stepKey: step.key,
          state: "claimed",
          attempts: 1,
          claimedAt: now,
        });

    // Advance in the SAME transaction as the claim. This is what makes a
    // double-schedule harmless.
    const nextStep = stepAt(e.track, e.nextStepIndex + 1);
    await ctx.db.patch(e._id, {
      lastStepSent: e.nextStepIndex + 1,
      nextStepIndex: e.nextStepIndex + 1,
      nextDueAt: now + (nextStep?.delayMs ?? track.weeklyDelayMs),
      phase: nextStep ? "daily" : "weekly",
      lastAttemptAt: now,
      updatedAt: now,
    });

    return {
      sendId,
      dedupeKey: key,
      email: e.email,
      name: e.name,
      track: e.track,
      stepKey: step.key,
      subject: step.subject ?? "",
      assessmentId: e.assessmentId,
      enrollmentId: e._id,
      stepIndex: e.nextStepIndex,
    };
  },
});

/** Record the outcome of a claimed send. Refuses anything not in `claimed`. */
export const completeStep = internalMutation({
  args: {
    sendId: v.id("sequenceStepSends"),
    ok: v.boolean(),
    resendId: v.optional(v.string()),
    subject: v.optional(v.string()),
    error: v.optional(v.string()),
    /** 4xx from Resend means the address is bad — retrying will never help. */
    permanent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const send = await ctx.db.get(args.sendId);
    if (!send) return null;
    if (send.state !== "claimed") return null;

    await ctx.db.patch(send._id, {
      state: args.ok ? "sent" : "failed",
      resendId: args.resendId,
      subject: args.subject,
      error: args.error,
      completedAt: now,
    });

    const e = await ctx.db.get(send.enrollmentId);
    if (!e) return null;

    if (args.ok) {
      await ctx.db.patch(e._id, { failureCount: 0, updatedAt: now });
      return { ok: true };
    }

    // Roll the cursor back so the same step is retried, unless it is hopeless.
    const failureCount = e.failureCount + 1;
    if (args.permanent || failureCount >= MAX_ENROLLMENT_FAILURES) {
      await ctx.db.patch(e._id, {
        status: "exited",
        exitReason: "send-failed-permanently",
        exitedAt: now,
        failureCount,
        updatedAt: now,
      });
      return { ok: false, exited: true };
    }

    await ctx.db.patch(e._id, {
      lastStepSent: Math.max(0, e.lastStepSent - 1),
      nextStepIndex: Math.max(0, e.nextStepIndex - 1),
      nextDueAt: now + backoffMs(failureCount),
      failureCount,
      updatedAt: now,
    });
    return { ok: false, exited: false };
  },
});

/**
 * Render and send one step. Claims first; a null claim means another sweep
 * already took it, so this returns silently rather than sending twice.
 */
export const deliverStep = internalAction({
  args: { enrollmentId: v.id("sequenceEnrollments") },
  handler: async (ctx, args) => {
    const claim = await ctx.runMutation(internal.sequenceEngine.claimStep, {
      enrollmentId: args.enrollmentId,
    });
    if (!claim) return { sent: false, reason: "not-claimable" };

    const result = await ctx.runAction(
      internal.emails.sendSequenceStep,
      {
        sendId: claim.sendId,
        dedupeKey: claim.dedupeKey,
        email: claim.email,
        name: claim.name,
        track: claim.track,
        stepKey: claim.stepKey,
        subject: claim.subject,
        assessmentId: claim.assessmentId,
      }
    );

    return { sent: result.ok, reason: result.ok ? "sent" : result.error };
  },
});

/**
 * The cron entry point. Reads a bounded batch of due enrollments and fans out.
 * Re-schedules itself when the batch came back full — the self-continuation
 * pattern from convex/_generated/ai/guidelines.md.
 */
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const due = await ctx.db
      .query("sequenceEnrollments")
      .withIndex("by_status_nextDueAt", (q) =>
        q.eq("status", "active").lte("nextDueAt", now)
      )
      .take(SWEEP_BATCH);

    for (const e of due) {
      await ctx.scheduler.runAfter(0, internal.sequenceEngine.deliverStep, {
        enrollmentId: e._id,
      });
    }

    if (due.length === SWEEP_BATCH) {
      await ctx.scheduler.runAfter(0, internal.sequenceEngine.sweep, {});
    }

    return { fannedOut: due.length };
  },
});
