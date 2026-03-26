// APPEND-ONLY — no update or delete mutations permitted
import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./lib/auth";

export const logActivity = mutation({
  args: {
    projectId: v.id("projects"),
    actorId: v.string(),
    eventType: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("activities", {
      projectId: args.projectId,
      actorId: args.actorId,
      eventType: args.eventType,
      description: args.description,
      timestamp: Date.now(),
    });
  },
});

export const listActivities = query({
  args: {
    projectId: v.id("projects"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    // Verify user has access to the project
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new ConvexError("Project not found");
    }

    // Allow admin to view any project activities, or client to view their own project activities
    if (user.role !== "admin" && project.clientId !== user.clerkUserId) {
      throw new ConvexError("Forbidden");
    }

    // Query activities by projectId and timestamp (most recent first)
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_projectId_timestamp", (q) =>
        q.eq("projectId", args.projectId)
      )
      .order("desc")
      .take(args.limit ?? 50);

    return activities;
  },
});
