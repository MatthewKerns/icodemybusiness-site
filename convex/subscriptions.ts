import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

export const createSubscription = mutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    plan: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("subscriptions", {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      plan: args.plan,
      status: args.status,
      createdAt: Date.now(),
    });
  },
});

export const updateSubscriptionStatus = mutation({
  args: {
    userId: v.string(),
    status: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    plan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) {
      throw new ConvexError("Subscription not found");
    }

    const updates: { status: string; stripeSubscriptionId?: string; plan?: string } = {
      status: args.status,
    };
    if (args.stripeSubscriptionId !== undefined) {
      updates.stripeSubscriptionId = args.stripeSubscriptionId;
    }
    if (args.plan !== undefined) {
      updates.plan = args.plan;
    }

    await ctx.db.patch(subscription._id, updates);
    return subscription._id;
  },
});

export const getActiveSubscription = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
  },
});
