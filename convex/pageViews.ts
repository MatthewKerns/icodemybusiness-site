import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const trackPageView = mutation({
  args: {
    page: v.string(),
    userId: v.optional(v.string()),
    referrer: v.optional(v.string()),
    source: v.optional(v.string()),
    variant: v.optional(v.string()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("pageViews", args);
  },
});
