import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { scoreLead } from "./lib/leadScoring";
import { rateLimit } from "./lib/rateLimits";
import { validateEmail } from "./lib/validators";

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

export const getLeadBySessionId = query({
  args: {
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leads")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});
