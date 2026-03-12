import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Create a new client
export const createClient = mutation({
  args: {
    companyName: v.string(),
    primaryContact: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      role: v.optional(v.string()),
    }),
    tier: v.optional(v.string()),
    monthlyRecurring: v.optional(v.number()),
    industry: v.optional(v.string()),
    website: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const clientId = await ctx.db.insert("clients", {
      ...args,
      status: "active",
      startDate: now,
      createdAt: now,
      updatedAt: now,
    });

    // Create activity log
    await ctx.db.insert("activityLogs", {
      action: "created",
      entityType: "client",
      entityId: clientId,
      entityName: args.companyName,
      timestamp: now,
    });

    // Create notification
    await ctx.db.insert("notifications", {
      userId: "admin", // TODO: Replace with actual admin user ID
      type: "success",
      category: "client",
      title: "New Client Added",
      message: `${args.companyName} has been added as a new client`,
      isRead: false,
      actionUrl: `/dashboard/clients/${clientId}`,
      actionLabel: "View Client",
      entityType: "client",
      entityId: clientId,
      createdAt: now,
    });

    return clientId;
  },
});

// Get all clients with optional filtering
export const getClients = query({
  args: {
    status: v.optional(v.string()),
    tier: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("clients");

    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status));
    } else if (args.tier) {
      query = query.withIndex("by_tier", (q) => q.eq("tier", args.tier));
    }

    const clients = await query
      .order("desc")
      .take(args.limit || 100);

    // Calculate total value for each client
    const clientsWithMetrics = await Promise.all(
      clients.map(async (client) => {
        // Get active projects count
        const projects = await ctx.db
          .query("projects")
          .withIndex("by_client", (q) => q.eq("clientId", client._id))
          .filter((q) => q.neq(q.field("status"), "completed"))
          .collect();

        // Get total deliverables
        const deliverables = await ctx.db
          .query("deliverables")
          .withIndex("by_client", (q) => q.eq("clientId", client._id))
          .collect();

        return {
          ...client,
          activeProjects: projects.length,
          totalDeliverables: deliverables.length,
          lifetime: Math.floor((Date.now() - client.startDate) / (1000 * 60 * 60 * 24)), // Days
        };
      })
    );

    return clientsWithMetrics;
  },
});

// Get a single client by ID
export const getClient = query({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.id);
    if (!client) return null;

    // Get related data
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_client", (q) => q.eq("clientId", args.id))
      .collect();

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_client", (q) => q.eq("clientId", args.id))
      .order("desc")
      .take(10);

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_client", (q) => q.eq("clientId", args.id))
      .collect();

    return {
      ...client,
      projects,
      recentMessages: messages,
      documents,
    };
  },
});

// Update client information
export const updateClient = mutation({
  args: {
    id: v.id("clients"),
    companyName: v.optional(v.string()),
    status: v.optional(v.string()),
    tier: v.optional(v.string()),
    monthlyRecurring: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();

    const client = await ctx.db.get(id);
    if (!client) throw new Error("Client not found");

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: now,
    });

    // Log the update
    await ctx.db.insert("activityLogs", {
      action: "updated",
      entityType: "client",
      entityId: id,
      entityName: client.companyName,
      changes: updates,
      timestamp: now,
    });

    return { success: true };
  },
});

// Add additional contact to client
export const addContact = mutation({
  args: {
    clientId: v.id("clients"),
    contact: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      role: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.clientId);
    if (!client) throw new Error("Client not found");

    const now = Date.now();
    const additionalContacts = client.additionalContacts || [];
    additionalContacts.push(args.contact);

    await ctx.db.patch(args.clientId, {
      additionalContacts,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Get client statistics
export const getClientStats = query({
  handler: async (ctx) => {
    const clients = await ctx.db.query("clients").collect();

    const stats = {
      total: clients.length,
      active: 0,
      churned: 0,
      totalMRR: 0,
      averageLTV: 0,
      byTier: {} as Record<string, number>,
      byIndustry: {} as Record<string, number>,
    };

    let totalLifetimeValue = 0;

    for (const client of clients) {
      // Count by status
      if (client.status === "active") {
        stats.active++;
        stats.totalMRR += client.monthlyRecurring || 0;
      } else if (client.status === "churned") {
        stats.churned++;
      }

      // Count by tier
      if (client.tier) {
        stats.byTier[client.tier] = (stats.byTier[client.tier] || 0) + 1;
      }

      // Count by industry
      if (client.industry) {
        stats.byIndustry[client.industry] = (stats.byIndustry[client.industry] || 0) + 1;
      }

      // Calculate lifetime value
      if (client.monthlyRecurring) {
        const monthsActive = Math.floor((Date.now() - client.startDate) / (1000 * 60 * 60 * 24 * 30));
        totalLifetimeValue += client.monthlyRecurring * monthsActive;
      }
    }

    stats.averageLTV = clients.length > 0 ? Math.round(totalLifetimeValue / clients.length) : 0;

    return stats;
  },
});

// Search clients
export const searchClients = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("clients")
      .withSearchIndex("search_clients", (q) =>
        q.search("companyName", args.searchTerm)
      )
      .take(10);

    return results;
  },
});

// Get client health score
export const getClientHealth = query({
  args: { id: v.id("clients") },
  handler: async (ctx, args) => {
    const client = await ctx.db.get(args.id);
    if (!client) return null;

    // Calculate health score based on various factors
    let healthScore = 100;
    const factors = {
      engagement: 0,
      projectSuccess: 0,
      paymentHistory: 0,
      communication: 0,
    };

    // Check recent project activity
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_client", (q) => q.eq("clientId", args.id))
      .collect();

    const activeProjects = projects.filter(p => p.status === "in_progress");
    const completedProjects = projects.filter(p => p.status === "completed");

    // Project success rate
    if (projects.length > 0) {
      const successRate = completedProjects.length / projects.length;
      factors.projectSuccess = successRate * 30;
    }

    // Check recent communication
    const recentMessages = await ctx.db
      .query("messages")
      .withIndex("by_client", (q) => q.eq("clientId", args.id))
      .order("desc")
      .take(10);

    if (recentMessages.length > 5) {
      factors.communication = 25;
    } else if (recentMessages.length > 0) {
      factors.communication = 15;
    }

    // Engagement based on active projects
    if (activeProjects.length > 0) {
      factors.engagement = Math.min(25, activeProjects.length * 10);
    }

    // Payment history (assuming on-time payments for now)
    factors.paymentHistory = 20;

    healthScore = Math.min(100, Object.values(factors).reduce((a, b) => a + b, 0));

    return {
      score: healthScore,
      factors,
      status: healthScore >= 80 ? "healthy" : healthScore >= 50 ? "at-risk" : "critical",
    };
  },
});

// Create client portal access
export const createPortalAccess = mutation({
  args: {
    clientId: v.id("clients"),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create user with client role
    const userId = await ctx.db.insert("users", {
      clerkId: `client_${args.clientId}_${now}`, // Temporary ID until Clerk integration
      email: args.email,
      name: args.name,
      role: "client",
      permissions: ["view_own_projects", "submit_requests", "view_documents"],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Send notification
    await ctx.db.insert("notifications", {
      userId,
      type: "success",
      category: "system",
      title: "Welcome to iCodeMyBusiness",
      message: "Your client portal access has been created. You can now view your projects and submit requests.",
      isRead: false,
      actionUrl: "/portal",
      actionLabel: "Go to Portal",
      createdAt: now,
    });

    return { userId, success: true };
  },
});