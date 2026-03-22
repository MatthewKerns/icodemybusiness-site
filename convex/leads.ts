import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { scoreLead } from "./lib/leadScoring";

export const createLead = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    source: v.optional(v.string()),
    variant: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new ConvexError("Invalid email address");
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
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.email.sendWelcomeEmail, {
      email,
      name: args.name,
    });

    return leadId;
  },
});
