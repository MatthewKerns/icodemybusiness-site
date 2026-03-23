import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireRole } from "./lib/auth";

export const createUser = mutation({
  args: v.object({
    clerkUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    source: v.optional(v.string()),
    role: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      name: args.name,
      role: args.role,
      source: args.source,
      createdAt: Date.now(),
    });
  },
});

export const getUserByClerkId = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
  },
});

export const setUserRole = mutation({
  args: {
    clerkUserId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const target = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!target) {
      throw new ConvexError("User not found");
    }

    await ctx.db.patch(target._id, { role: args.role });
    return target._id;
  },
});

export const updateUserProfile = mutation({
  args: {
    clerkUserId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    const updates: { name?: string; email?: string } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.email !== undefined) updates.email = args.email;

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});
