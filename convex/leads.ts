import { mutation } from "./_generated/server";
import { v } from "convex/values";
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
    const existing = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      return existing._id;
    }

    const score = scoreLead(args.source);

    return await ctx.db.insert("leads", {
      email: args.email,
      name: args.name,
      source: args.source,
      variant: args.variant,
      score,
      sessionId: args.sessionId,
      createdAt: Date.now(),
    });
  },
});
