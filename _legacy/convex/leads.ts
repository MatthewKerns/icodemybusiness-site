import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Create a new lead
export const createLead = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    company: v.optional(v.string()),
    source: v.string(),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    metadata: v.optional(v.object({
      calendlyEventId: v.optional(v.string()),
      voiceCallId: v.optional(v.string()),
      linkedinProfileUrl: v.optional(v.string()),
      referralSource: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Calculate initial lead score based on source
    const scoreBySource: Record<string, number> = {
      "referral": 80,
      "calendly": 70,
      "voice_agent": 65,
      "website": 50,
      "linkedin": 40,
      "cold": 20,
    };

    const lead = await ctx.db.insert("leads", {
      ...args,
      status: "new",
      score: scoreBySource[args.source] || 30,
      createdAt: now,
      updatedAt: now,
    });

    // Create activity log
    await ctx.db.insert("activityLogs", {
      action: "created",
      entityType: "lead",
      entityId: lead,
      entityName: args.name,
      timestamp: now,
    });

    return lead;
  },
});

// Get all leads with optional filtering
export const getLeads = query({
  args: {
    status: v.optional(v.string()),
    source: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("leads");

    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status));
    } else if (args.source) {
      query = query.withIndex("by_source", (q) => q.eq("source", args.source));
    } else if (args.assignedTo) {
      query = query.withIndex("by_assigned", (q) => q.eq("assignedTo", args.assignedTo));
    }

    const leads = await query
      .order("desc")
      .take(args.limit || 100);

    return leads;
  },
});

// Get a single lead by ID
export const getLead = query({
  args: { id: v.id("leads") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update lead status (move through pipeline)
export const updateLeadStatus = mutation({
  args: {
    id: v.id("leads"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.id);
    if (!lead) throw new Error("Lead not found");

    const oldStatus = lead.status;
    const now = Date.now();

    await ctx.db.patch(args.id, {
      status: args.status,
      notes: args.notes || lead.notes,
      updatedAt: now,
    });

    // Log the status change
    await ctx.db.insert("activityLogs", {
      action: "updated",
      entityType: "lead",
      entityId: args.id,
      entityName: lead.name,
      changes: {
        status: { from: oldStatus, to: args.status },
      },
      timestamp: now,
    });

    // If lead is won, create a client
    if (args.status === "won") {
      await ctx.db.insert("clients", {
        companyName: lead.company || lead.name,
        primaryContact: {
          name: lead.name,
          email: lead.email || "",
          phone: lead.phone,
        },
        status: "active",
        startDate: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

// Update lead score
export const updateLeadScore = mutation({
  args: {
    id: v.id("leads"),
    score: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.id, {
      score: Math.min(100, Math.max(0, args.score)),
      updatedAt: now,
    });

    return { success: true };
  },
});

// Assign lead to user
export const assignLead = mutation({
  args: {
    id: v.id("leads"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.id);
    if (!lead) throw new Error("Lead not found");

    const now = Date.now();

    await ctx.db.patch(args.id, {
      assignedTo: args.userId,
      updatedAt: now,
    });

    // Create notification for assigned user
    await ctx.db.insert("notifications", {
      userId: args.userId,
      type: "info",
      category: "lead",
      title: "New Lead Assigned",
      message: `You have been assigned a new lead: ${lead.name}`,
      isRead: false,
      actionUrl: `/dashboard/leads/${args.id}`,
      actionLabel: "View Lead",
      entityType: "lead",
      entityId: args.id,
      createdAt: now,
    });

    return { success: true };
  },
});

// Schedule follow-up
export const scheduleFollowUp = mutation({
  args: {
    id: v.id("leads"),
    followUpDate: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    await ctx.db.patch(args.id, {
      nextFollowUp: args.followUpDate,
      notes: args.notes,
      updatedAt: now,
    });

    return { success: true };
  },
});

// Search leads
export const searchLeads = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("leads")
      .withSearchIndex("search_leads", (q) =>
        q.search("name", args.searchTerm)
      )
      .take(20);

    return results;
  },
});

// Get lead statistics
export const getLeadStats = query({
  handler: async (ctx) => {
    const leads = await ctx.db.query("leads").collect();

    const stats = {
      total: leads.length,
      byStatus: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
      avgScore: 0,
      conversionRate: 0,
    };

    let totalScore = 0;
    let wonCount = 0;

    leads.forEach((lead) => {
      // Count by status
      stats.byStatus[lead.status] = (stats.byStatus[lead.status] || 0) + 1;

      // Count by source
      stats.bySource[lead.source] = (stats.bySource[lead.source] || 0) + 1;

      // Sum scores
      if (lead.score) {
        totalScore += lead.score;
      }

      // Count won
      if (lead.status === "won") {
        wonCount++;
      }
    });

    stats.avgScore = leads.length > 0 ? Math.round(totalScore / leads.length) : 0;
    stats.conversionRate = leads.length > 0 ? (wonCount / leads.length) * 100 : 0;

    return stats;
  },
});

// Create lead from Calendly webhook
export const createLeadFromCalendly = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    eventId: v.string(),
    eventTime: v.number(),
    eventType: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if lead already exists with this email
    const existingLead = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingLead) {
      // Update existing lead
      await ctx.db.patch(existingLead._id, {
        status: "qualified",
        score: Math.min(100, (existingLead.score || 0) + 20),
        metadata: {
          ...existingLead.metadata,
          calendlyEventId: args.eventId,
        },
        updatedAt: now,
      });

      // Create appointment
      await ctx.db.insert("appointments", {
        title: `${args.eventType} with ${args.name}`,
        type: "consultation",
        startTime: args.eventTime,
        endTime: args.eventTime + 3600000, // 1 hour
        location: "zoom",
        attendees: [{
          name: args.name,
          email: args.email,
          type: "lead",
          entityId: existingLead._id,
        }],
        status: "scheduled",
        leadId: existingLead._id,
        calendlyEventId: args.eventId,
        createdAt: now,
        updatedAt: now,
      });

      return existingLead._id;
    }

    // Create new lead
    const leadId = await ctx.db.insert("leads", {
      name: args.name,
      email: args.email,
      source: "calendly",
      status: "qualified",
      score: 70,
      metadata: {
        calendlyEventId: args.eventId,
      },
      createdAt: now,
      updatedAt: now,
    });

    // Create appointment
    await ctx.db.insert("appointments", {
      title: `${args.eventType} with ${args.name}`,
      type: "consultation",
      startTime: args.eventTime,
      endTime: args.eventTime + 3600000, // 1 hour
      location: "zoom",
      attendees: [{
        name: args.name,
        email: args.email,
        type: "lead",
        entityId: leadId,
      }],
      status: "scheduled",
      leadId,
      calendlyEventId: args.eventId,
      createdAt: now,
      updatedAt: now,
    });

    return leadId;
  },
});