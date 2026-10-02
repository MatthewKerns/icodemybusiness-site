/**
 * The suppression list: who must not be emailed, and why.
 *
 * Writes are internal-only. A public mutation here would let anyone suppress
 * anyone else's address — a denial-of-delivery on the whole list — so the
 * only routes in are the signed unsubscribe token and the signed Resend
 * webhook, both of which authenticate before calling in.
 */

import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";
import { validateEmail } from "./lib/validators";
import { findSuppression } from "./lib/suppression";

const reasonValidator = v.union(
  v.literal("unsubscribe"),
  v.literal("hard_bounce"),
  v.literal("complaint"),
  v.literal("manual")
);

const scopeValidator = v.union(v.literal("all"), v.literal("marketing"));

/**
 * Suppress an address and exit every sequence it is enrolled in.
 *
 * Idempotent: re-suppressing for the same reason does not stack rows, so a
 * mail client's link prefetcher hitting the unsubscribe URL twice is a no-op
 * rather than a mess.
 */
export const suppress = internalMutation({
  args: {
    email: v.string(),
    reason: reasonValidator,
    scope: scopeValidator,
    source: v.optional(v.string()),
    detail: v.optional(v.string()),
    resendId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = validateEmail(args.email);
    const now = Date.now();

    const existing = await ctx.db
      .query("emailSuppressions")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    const live = existing.find(
      (r) => r.revokedAt === undefined && r.reason === args.reason
    );

    if (!live) {
      await ctx.db.insert("emailSuppressions", {
        email,
        reason: args.reason,
        scope: args.scope,
        source: args.source,
        detail: args.detail,
        resendId: args.resendId,
        createdAt: now,
      });
    }

    // Exit every enrollment for this address, whatever the track.
    const enrollments = await ctx.db
      .query("sequenceEnrollments")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();

    let exited = 0;
    for (const e of enrollments) {
      if (e.status === "exited") continue;
      await ctx.db.patch(e._id, {
        status: "exited",
        exitReason:
          args.reason === "unsubscribe" ? "unsubscribed" : "suppressed",
        exitedAt: now,
        updatedAt: now,
      });
      exited++;
    }

    return { email, alreadySuppressed: Boolean(live), enrollmentsExited: exited };
  },
});

/** Owner-only re-subscribe, e.g. after a bounce that turned out to be transient. */
export const revoke = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = validateEmail(args.email);
    const now = Date.now();
    const rows = await ctx.db
      .query("emailSuppressions")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect();
    let revoked = 0;
    for (const r of rows) {
      if (r.revokedAt !== undefined) continue;
      await ctx.db.patch(r._id, { revokedAt: now });
      revoked++;
    }
    return { email, revoked };
  },
});

/** Admin-gated: is this address suppressed, and why. */
export const adminCheck = query({
  args: { email: v.string(), scope: scopeValidator },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const email = validateEmail(args.email);
    return await findSuppression(
      ctx,
      email,
      args.scope === "all" ? "transactional" : "marketing"
    );
  },
});

/** Admin-gated listing for the dashboard. */
export const adminList = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const limit = Math.min(args.limit ?? 100, 500);
    return await ctx.db
      .query("emailSuppressions")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
  },
});
