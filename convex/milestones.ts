import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireRole } from "./lib/auth";

export const createMilestone = mutation({
  args: v.object({
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(),
    dueDate: v.number(),
    order: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    return await ctx.db.insert("milestones", {
      projectId: args.projectId,
      title: args.title,
      description: args.description,
      status: args.status,
      dueDate: args.dueDate,
      order: args.order,
      createdAt: Date.now(),
    });
  },
});

export const getMilestone = query({
  args: {
    milestoneId: v.id("milestones"),
  },
  handler: async (ctx, args) => {
    const milestone = await ctx.db.get(args.milestoneId);

    if (!milestone) {
      throw new ConvexError("Milestone not found");
    }

    return milestone;
  },
});

export const getMilestonesByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("milestones")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getMilestonesByProjectOrdered = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("milestones")
      .withIndex("by_projectId_order", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getMilestonesTimeline = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const milestones = await ctx.db
      .query("milestones")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();

    return milestones.sort((a, b) => a.dueDate - b.dueDate);
  },
});

export const updateMilestone = mutation({
  args: {
    milestoneId: v.id("milestones"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const milestone = await ctx.db.get(args.milestoneId);

    if (!milestone) {
      throw new ConvexError("Milestone not found");
    }

    const updates: {
      title?: string;
      description?: string;
      status?: string;
      dueDate?: number;
      order?: number;
    } = {};

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.order !== undefined) updates.order = args.order;

    await ctx.db.patch(args.milestoneId, updates);
    return args.milestoneId;
  },
});

export const deleteMilestone = mutation({
  args: {
    milestoneId: v.id("milestones"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const milestone = await ctx.db.get(args.milestoneId);

    if (!milestone) {
      throw new ConvexError("Milestone not found");
    }

    await ctx.db.delete(args.milestoneId);
    return args.milestoneId;
  },
});
