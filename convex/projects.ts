import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireRole, getAuthenticatedUser } from "./lib/auth";

export const createProject = mutation({
  args: v.object({
    title: v.string(),
    description: v.optional(v.string()),
    clientId: v.string(),
    status: v.string(),
    progress: v.number(),
    startDate: v.number(),
    endDate: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    return await ctx.db.insert("projects", {
      title: args.title,
      description: args.description,
      clientId: args.clientId,
      status: args.status,
      progress: args.progress,
      startDate: args.startDate,
      endDate: args.endDate,
      createdAt: Date.now(),
    });
  },
});

export const getProject = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new ConvexError("Project not found");
    }

    // Allow admin to view any project, or client to view their own projects
    if (user.role !== "admin" && project.clientId !== user.clerkUserId) {
      throw new ConvexError("Forbidden");
    }

    return project;
  },
});

export const listProjects = query({
  args: {
    clientId: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (!user) {
      throw new ConvexError("Unauthorized");
    }

    // If filtering by clientId
    if (args.clientId) {
      // Admin can view any client's projects, clients can only view their own
      if (user.role !== "admin" && args.clientId !== user.clerkUserId) {
        throw new ConvexError("Forbidden");
      }

      let query = ctx.db
        .query("projects")
        .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId));

      const projects = await query.collect();

      // Filter by status if provided
      if (args.status) {
        return projects.filter((p) => p.status === args.status);
      }

      return projects;
    }

    // If filtering by status only
    if (args.status) {
      const projects = await ctx.db
        .query("projects")
        .withIndex("by_status", (q) => q.eq("status", args.status))
        .collect();

      // Non-admin users can only see their own projects
      if (user.role !== "admin") {
        return projects.filter((p) => p.clientId === user.clerkUserId);
      }

      return projects;
    }

    // No filters - return all projects
    const allProjects = await ctx.db.query("projects").collect();

    // Non-admin users can only see their own projects
    if (user.role !== "admin") {
      return allProjects.filter((p) => p.clientId === user.clerkUserId);
    }

    return allProjects;
  },
});

export const updateProject = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.string()),
    progress: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new ConvexError("Project not found");
    }

    const updates: {
      title?: string;
      description?: string;
      status?: string;
      progress?: number;
      startDate?: number;
      endDate?: number;
    } = {};

    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.progress !== undefined) updates.progress = args.progress;
    if (args.startDate !== undefined) updates.startDate = args.startDate;
    if (args.endDate !== undefined) updates.endDate = args.endDate;

    await ctx.db.patch(args.projectId, updates);
    return args.projectId;
  },
});

export const deleteProject = mutation({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const project = await ctx.db.get(args.projectId);
    if (!project) {
      throw new ConvexError("Project not found");
    }

    await ctx.db.delete(args.projectId);
    return args.projectId;
  },
});
