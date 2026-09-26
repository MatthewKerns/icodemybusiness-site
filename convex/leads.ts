import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { scoreLead } from "./lib/leadScoring";
import { rateLimit } from "./lib/rateLimits";
import { validateEmail } from "./lib/validators";
import { requireOwner } from "./lib/auth";

export const createLead = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    source: v.optional(v.string()),
    variant: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = validateEmail(args.email);

    const rateLimitKey = `${args.sessionId ?? "anon"}:${email}`;
    const { ok, retryAt } = await rateLimit(ctx, {
      name: "emailCapture",
      key: rateLimitKey,
    });
    if (!ok) {
      throw new ConvexError({
        kind: "RateLimited" as const,
        message: "Too many attempts. Please try again in a moment.",
        retryAt: retryAt ?? Date.now() + 60_000,
      });
    }

    const existing = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existing) {
      // Re-link the existing lead to the current session / Clerk user so that
      // access checks (keyed on these) succeed for returning visitors whose
      // email is already on file but whose browser session has changed.
      const patch: { sessionId?: string; clerkUserId?: string } = {};
      if (args.sessionId && args.sessionId !== existing.sessionId) {
        patch.sessionId = args.sessionId;
      }
      if (args.clerkUserId && args.clerkUserId !== existing.clerkUserId) {
        patch.clerkUserId = args.clerkUserId;
      }
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existing._id, patch);
      }
      return existing._id;
    }

    const score = scoreLead(args.source);

    const leadId = await ctx.db.insert("leads", {
      email,
      name: args.name,
      source: args.source,
      variant: args.variant,
      score,
      sessionId: args.sessionId,
      clerkUserId: args.clerkUserId,
      createdAt: Date.now(),
    });

    return leadId;
  },
});

/** Used to gate the unauthenticated welcome-email send to emails that actually went through createLead. */
export const getLeadByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

const MAX_ROWS = 10_000;
const DAY_MS = 86_400_000;

/**
 * Owner-only lead counts for the funnel report: total and by `source` over
 * the last `windowDays`, plus how many got the welcome email. `leads` has no
 * createdAt index; at the site's volume a filtered scan is fine (TODO: add
 * `by_createdAt` when the table passes a few thousand rows).
 */
export const adminCounts = query({
  args: { windowDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const windowDays = Math.min(365, Math.max(1, Math.floor(args.windowDays ?? 30)));
    const until = Date.now();
    const since = until - windowDays * DAY_MS;
    const rows = await ctx.db
      .query("leads")
      .filter((q) => q.gte(q.field("createdAt"), since))
      .take(MAX_ROWS);

    const bySource: Record<string, number> = {};
    let withWelcomeEmail = 0;
    for (const l of rows) {
      const key = l.source ?? "unknown";
      bySource[key] = (bySource[key] ?? 0) + 1;
      if (l.welcomeEmailSentAt) withWelcomeEmail++;
    }
    return { windowDays, since, until, total: rows.length, bySource, withWelcomeEmail, truncated: rows.length === MAX_ROWS };
  },
});
