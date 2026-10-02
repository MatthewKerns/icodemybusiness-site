import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateEmail } from "./lib/validators";
import { requireOwner, requireRole } from "./lib/auth";

/**
 * Record the outcome of a transactional send. Called by the Next.js email
 * routes right after handing the message to Resend. Only annotates addresses
 * that already exist as leads, so it cannot be used to inject arbitrary rows.
 */
export const record = mutation({
  args: {
    to: v.string(),
    template: v.string(),
    subject: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    resendId: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const to = validateEmail(args.to);
    const lead = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", to))
      .first();
    if (!lead) return null;

    const now = Date.now();
    const id = await ctx.db.insert("emailSends", {
      to,
      template: args.template,
      subject: args.subject,
      status: args.status,
      resendId: args.resendId,
      error: args.error,
      leadId: lead._id,
      createdAt: now,
    });
    if (args.status === "sent" && args.template === "welcome") {
      await ctx.db.patch(lead._id, {
        welcomeEmailSentAt: now,
        welcomeEmailResendId: args.resendId,
      });
    }
    return id;
  },
});

/**
 * Most recent sends, newest first.
 *
 * Admin-gated. This was a public query until 2026-09-04, which meant anyone
 * holding the Convex deployment URL could enumerate every address the site had
 * ever emailed.
 */
export const listRecent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    return await ctx.db
      .query("emailSends")
      .withIndex("by_createdAt")
      .order("desc")
      .take(Math.min(args.limit ?? 50, 200));
  },
});

/** Sends to one address, newest first. Admin-gated — see `listRecent`. */
export const listForEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const to = validateEmail(args.email);
    return await ctx.db
      .query("emailSends")
      .withIndex("by_to", (q) => q.eq("to", to))
      .order("desc")
      .take(50);
  },
});

const MAX_ROWS = 10_000;
const DAY_MS = 86_400_000;

/**
 * Owner-only send counts for the funnel report: sent/failed totals and a
 * per-template split over the last `windowDays`.
 */
export const adminCounts = query({
  args: { windowDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const windowDays = Math.min(365, Math.max(1, Math.floor(args.windowDays ?? 30)));
    const until = Date.now();
    const since = until - windowDays * DAY_MS;
    const rows = await ctx.db
      .query("emailSends")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", since))
      .take(MAX_ROWS);

    const byTemplate: Record<string, { sent: number; failed: number }> = {};
    let sent = 0;
    let failed = 0;
    for (const r of rows) {
      const t = (byTemplate[r.template] ??= { sent: 0, failed: 0 });
      if (r.status === "sent") {
        sent++;
        t.sent++;
      } else {
        failed++;
        t.failed++;
      }
    }
    return { windowDays, since, until, total: rows.length, sent, failed, byTemplate, truncated: rows.length === MAX_ROWS };
  },
});
