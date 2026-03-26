import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireRole } from "./lib/auth";

export const createDeliverable = mutation({
  args: v.object({
    projectId: v.id("projects"),
    milestoneId: v.optional(v.id("milestones")),
    name: v.string(),
    description: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    return await ctx.db.insert("deliverables", {
      projectId: args.projectId,
      milestoneId: args.milestoneId,
      name: args.name,
      description: args.description,
      fileId: args.fileId,
      status: args.status,
      uploadedAt: args.fileId ? Date.now() : undefined,
      createdAt: Date.now(),
    });
  },
});

export const updateDeliverable = mutation({
  args: v.object({
    deliverableId: v.id("deliverables"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    fileId: v.optional(v.id("_storage")),
    status: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const deliverable = await ctx.db.get(args.deliverableId);
    if (!deliverable) {
      throw new ConvexError("Deliverable not found");
    }

    const updates: {
      name?: string;
      description?: string;
      fileId?: Id<"_storage">;
      status?: string;
      uploadedAt?: number;
    } = {};

    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.fileId !== undefined) {
      updates.fileId = args.fileId;
      updates.uploadedAt = Date.now();
    }

    await ctx.db.patch(args.deliverableId, updates);
    return args.deliverableId;
  },
});

export const deleteDeliverable = mutation({
  args: {
    deliverableId: v.id("deliverables"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const deliverable = await ctx.db.get(args.deliverableId);
    if (!deliverable) {
      throw new ConvexError("Deliverable not found");
    }

    await ctx.db.delete(args.deliverableId);
    return args.deliverableId;
  },
});

export const getDeliverable = query({
  args: {
    deliverableId: v.id("deliverables"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.deliverableId);
  },
});

export const getDeliverablesByProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deliverables")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const getDeliverablesByMilestone = query({
  args: {
    milestoneId: v.id("milestones"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("deliverables")
      .withIndex("by_milestoneId", (q) => q.eq("milestoneId", args.milestoneId))
      .collect();
  },
});
