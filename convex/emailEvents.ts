import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOwner } from "./lib/auth";
import { validateEmail } from "./lib/validators";

const MAX_ROWS = 10_000;
const DAY_MS = 86_400_000;

/**
 * Store one Resend delivery/engagement callback. Idempotent on
 * (resendId, type, occurredAt): Svix redelivers on any non-2xx and our own
 * retries must not double-count an open or a click. Called only from the
 * signed `/webhooks/resend` route.
 */
export const record = internalMutation({
  args: {
    resendId: v.string(),
    type: v.string(),
    email: v.string(),
    link: v.optional(v.string()),
    occurredAt: v.number(),
  },
  handler: async (ctx, args) => {
    const email = validateEmail(args.email);
    const dup = await ctx.db
      .query("emailEvents")
      .withIndex("by_resendId", (q) => q.eq("resendId", args.resendId))
      .filter((q) =>
        q.and(q.eq(q.field("type"), args.type), q.eq(q.field("occurredAt"), args.occurredAt))
      )
      .first();
    if (dup) return null;
    return await ctx.db.insert("emailEvents", {
      resendId: args.resendId,
      type: args.type,
      email,
      link: args.link,
      occurredAt: args.occurredAt,
      createdAt: Date.now(),
    });
  },
});

/**
 * Owner-only engagement counts for the funnel report: events by type plus
 * unique addresses that opened / clicked, over the last `windowDays`.
 */
export const adminCounts = query({
  args: { windowDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const windowDays = Math.min(365, Math.max(1, Math.floor(args.windowDays ?? 30)));
    const until = Date.now();
    const since = until - windowDays * DAY_MS;
    const rows = await ctx.db
      .query("emailEvents")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", since))
      .take(MAX_ROWS);

    const byType: Record<string, number> = {};
    const opened = new Set<string>();
    const clicked = new Set<string>();
    for (const e of rows) {
      byType[e.type] = (byType[e.type] ?? 0) + 1;
      if (e.type === "email.opened") opened.add(e.email);
      if (e.type === "email.clicked") clicked.add(e.email);
    }
    return {
      windowDays,
      since,
      until,
      total: rows.length,
      byType,
      uniqueOpened: opened.size,
      uniqueClicked: clicked.size,
      truncated: rows.length === MAX_ROWS,
    };
  },
});
