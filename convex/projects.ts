import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Create a new project
export const createProject = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    priority: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    budget: v.optional(v.number()),
    teamMembers: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const projectId = await ctx.db.insert("projects", {
      ...args,
      status: "planning",
      priority: args.priority || "medium",
      startDate: now,
      createdAt: now,
      updatedAt: now,
    });

    // Get client info for notification
    const client = await ctx.db.get(args.clientId);

    // Create activity log
    await ctx.db.insert("activityLogs", {
      action: "created",
      entityType: "project",
      entityId: projectId,
      entityName: args.name,
      metadata: {
        clientName: client?.companyName,
      },
      timestamp: now,
    });

    // Notify team members
    if (args.teamMembers && args.teamMembers.length > 0) {
      for (const userId of args.teamMembers) {
        await ctx.db.insert("notifications", {
          userId,
          type: "info",
          category: "project",
          title: "New Project Assignment",
          message: `You've been assigned to project: ${args.name}`,
          isRead: false,
          actionUrl: `/dashboard/projects/${projectId}`,
          actionLabel: "View Project",
          entityType: "project",
          entityId: projectId,
          createdAt: now,
        });
      }
    }

    return projectId;
  },
});

// Get all projects with optional filtering
export const getProjects = query({
  args: {
    clientId: v.optional(v.id("clients")),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("projects");

    if (args.clientId) {
      query = query.withIndex("by_client", (q) => q.eq("clientId", args.clientId));
    } else if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status));
    } else if (args.priority) {
      query = query.withIndex("by_priority", (q) => q.eq("priority", args.priority));
    } else if (args.type) {
      query = query.withIndex("by_type", (q) => q.eq("type", args.type));
    }

    const projects = await query
      .order("desc")
      .take(args.limit || 50);

    // Enrich with client names and deliverable counts
    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const client = await ctx.db.get(project.clientId);
        const deliverables = await ctx.db
          .query("deliverables")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const completedDeliverables = deliverables.filter(d => d.status === "delivered").length;
        const progress = deliverables.length > 0
          ? Math.round((completedDeliverables / deliverables.length) * 100)
          : 0;

        return {
          ...project,
          clientName: client?.companyName || "Unknown",
          totalDeliverables: deliverables.length,
          completedDeliverables,
          progress,
          isOverdue: project.dueDate && project.dueDate < Date.now() && project.status !== "completed",
        };
      })
    );

    return enrichedProjects;
  },
});

// Get a single project by ID
export const getProject = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) return null;

    // Get related data
    const client = await ctx.db.get(project.clientId);
    const deliverables = await ctx.db
      .query("deliverables")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .order("desc")
      .take(10);

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    return {
      ...project,
      client,
      deliverables,
      recentMessages: messages,
      documents,
    };
  },
});

// Update project status
export const updateProjectStatus = mutation({
  args: {
    id: v.id("projects"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) throw new Error("Project not found");

    const now = Date.now();
    const oldStatus = project.status;

    const updates: any = {
      status: args.status,
      updatedAt: now,
    };

    // If completing the project, set completion date
    if (args.status === "completed" && !project.completedDate) {
      updates.completedDate = now;
    }

    await ctx.db.patch(args.id, updates);

    // Log the status change
    await ctx.db.insert("activityLogs", {
      action: "updated",
      entityType: "project",
      entityId: args.id,
      entityName: project.name,
      changes: {
        status: { from: oldStatus, to: args.status },
      },
      timestamp: now,
    });

    // Notify client if project is completed
    if (args.status === "completed") {
      const client = await ctx.db.get(project.clientId);
      if (client) {
        await ctx.db.insert("notifications", {
          userId: client.primaryContact.email, // TODO: Get actual user ID
          type: "success",
          category: "project",
          title: "Project Completed",
          message: `Your project "${project.name}" has been completed!`,
          isRead: false,
          actionUrl: `/portal/projects/${args.id}`,
          actionLabel: "View Project",
          entityType: "project",
          entityId: args.id,
          createdAt: now,
        });
      }
    }

    return { success: true };
  },
});

// Update project details
export const updateProject = mutation({
  args: {
    id: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    priority: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    budget: v.optional(v.number()),
    actualCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Add milestone to project
export const addMilestone = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    dueDate: v.number(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const milestones = project.milestones || [];
    milestones.push({
      name: args.name,
      dueDate: args.dueDate,
      status: "pending",
    });

    await ctx.db.patch(args.projectId, {
      milestones,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update milestone status
export const updateMilestone = mutation({
  args: {
    projectId: v.id("projects"),
    milestoneName: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project || !project.milestones) throw new Error("Project or milestone not found");

    const now = Date.now();
    const milestones = project.milestones.map(m => {
      if (m.name === args.milestoneName) {
        return {
          ...m,
          status: args.status,
          completedDate: args.status === "completed" ? now : m.completedDate,
        };
      }
      return m;
    });

    await ctx.db.patch(args.projectId, {
      milestones,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Get project statistics
export const getProjectStats = query({
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();

    const stats = {
      total: projects.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      active: 0,
      overdue: 0,
      completedOnTime: 0,
      averageCompletionTime: 0,
      totalBudget: 0,
      totalActualCost: 0,
    };

    let totalCompletionTime = 0;
    let completedCount = 0;

    for (const project of projects) {
      // Count by status
      stats.byStatus[project.status] = (stats.byStatus[project.status] || 0) + 1;

      // Count by type
      stats.byType[project.type] = (stats.byType[project.type] || 0) + 1;

      // Count by priority
      stats.byPriority[project.priority] = (stats.byPriority[project.priority] || 0) + 1;

      // Count active
      if (project.status === "in_progress") {
        stats.active++;
      }

      // Check overdue
      if (project.dueDate && project.dueDate < Date.now() && project.status !== "completed") {
        stats.overdue++;
      }

      // Calculate on-time completion
      if (project.status === "completed" && project.completedDate) {
        completedCount++;
        const completionTime = project.completedDate - project.startDate;
        totalCompletionTime += completionTime;

        if (!project.dueDate || project.completedDate <= project.dueDate) {
          stats.completedOnTime++;
        }
      }

      // Sum budgets
      stats.totalBudget += project.budget || 0;
      stats.totalActualCost += project.actualCost || 0;
    }

    // Calculate average completion time in days
    if (completedCount > 0) {
      stats.averageCompletionTime = Math.round(totalCompletionTime / completedCount / (1000 * 60 * 60 * 24));
    }

    return stats;
  },
});

// Get project timeline
export const getProjectTimeline = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) return null;

    // Get all activity logs for this project
    const activities = await ctx.db
      .query("activityLogs")
      .withIndex("by_entity", (q) =>
        q.eq("entityType", "project").eq("entityId", args.id)
      )
      .order("desc")
      .collect();

    // Get deliverables timeline
    const deliverables = await ctx.db
      .query("deliverables")
      .withIndex("by_project", (q) => q.eq("projectId", args.id))
      .collect();

    const timeline = [
      {
        date: project.createdAt,
        type: "project_created",
        title: "Project Created",
        description: `Project "${project.name}" was created`,
      },
      ...activities.map(activity => ({
        date: activity.timestamp,
        type: `project_${activity.action}`,
        title: `Project ${activity.action}`,
        description: JSON.stringify(activity.changes),
      })),
      ...deliverables.map(d => ({
        date: d.createdAt,
        type: "deliverable_added",
        title: `Deliverable Added: ${d.name}`,
        description: d.description,
      })),
    ];

    // Add milestones to timeline
    if (project.milestones) {
      project.milestones.forEach(m => {
        timeline.push({
          date: m.dueDate,
          type: "milestone",
          title: `Milestone: ${m.name}`,
          description: `Status: ${m.status}`,
        });
      });
    }

    // Sort timeline by date
    timeline.sort((a, b) => b.date - a.date);

    return timeline;
  },
});

// Create project from template
export const createProjectFromTemplate = mutation({
  args: {
    clientId: v.id("clients"),
    templateType: v.string(), // "website", "app", "automation"
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Define template configurations
    const templates: Record<string, any> = {
      website: {
        type: "website",
        milestones: [
          { name: "Discovery & Requirements", dueDate: now + 7 * 24 * 60 * 60 * 1000, status: "pending" },
          { name: "Design Mockups", dueDate: now + 14 * 24 * 60 * 60 * 1000, status: "pending" },
          { name: "Development", dueDate: now + 28 * 24 * 60 * 60 * 1000, status: "pending" },
          { name: "Testing & Launch", dueDate: now + 35 * 24 * 60 * 60 * 1000, status: "pending" },
        ],
        description: "Website development project",
        priority: "medium",
      },
      app: {
        type: "app",
        milestones: [
          { name: "Requirements Gathering", dueDate: now + 7 * 24 * 60 * 60 * 1000, status: "pending" },
          { name: "UI/UX Design", dueDate: now + 21 * 24 * 60 * 60 * 1000, status: "pending" },
          { name: "MVP Development", dueDate: now + 60 * 24 * 60 * 60 * 1000, status: "pending" },
          { name: "Beta Testing", dueDate: now + 75 * 24 * 60 * 60 * 1000, status: "pending" },
          { name: "Production Release", dueDate: now + 90 * 24 * 60 * 60 * 1000, status: "pending" },
        ],
        description: "Application development project",
        priority: "high",
      },
      automation: {
        type: "automation",
        milestones: [
          { name: "Process Analysis", dueDate: now + 3 * 24 * 60 * 60 * 1000, status: "pending" },
          { name: "Workflow Design", dueDate: now + 7 * 24 * 60 * 60 * 1000, status: "pending" },
          { name: "Implementation", dueDate: now + 14 * 24 * 60 * 60 * 1000, status: "pending" },
          { name: "Testing & Deployment", dueDate: now + 21 * 24 * 60 * 60 * 1000, status: "pending" },
        ],
        description: "Process automation project",
        priority: "medium",
      },
    };

    const template = templates[args.templateType];
    if (!template) throw new Error("Invalid template type");

    const projectId = await ctx.db.insert("projects", {
      clientId: args.clientId,
      name: args.name,
      ...template,
      status: "planning",
      startDate: now,
      dueDate: template.milestones[template.milestones.length - 1].dueDate,
      createdAt: now,
      updatedAt: now,
    });

    return projectId;
  },
});