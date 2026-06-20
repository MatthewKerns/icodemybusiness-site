import { v, ConvexError } from "convex/values";
import {
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./lib/auth";
import { scoreLead } from "./lib/leadScoring";

// --- Internal mutations (called by webhook handler) ---

export const startConversation = internalMutation({
  args: {
    retellCallId: v.string(),
    modality: v.string(),
    agentId: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Defensive creation: return existing if already created
    const existing = await ctx.db
      .query("conversations")
      .withIndex("by_retellCallId", (q) => q.eq("retellCallId", args.retellCallId))
      .first();
    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("conversations", {
      retellCallId: args.retellCallId,
      modality: args.modality,
      agentId: args.agentId,
      source: args.source,
      status: "active",
      roadmapRequested: false,
      bookingEmailSent: false,
      startedAt: Date.now(),
    });
  },
});

export const completeConversation = internalMutation({
  args: {
    retellCallId: v.string(),
    summary: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    recordingUrl: v.optional(v.string()),
    publicLogUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let conversation = await ctx.db
      .query("conversations")
      .withIndex("by_retellCallId", (q) => q.eq("retellCallId", args.retellCallId))
      .first();

    // Defensive creation: if call_ended arrives before call_started
    if (!conversation) {
      const id = await ctx.db.insert("conversations", {
        retellCallId: args.retellCallId,
        modality: "voice",
        agentId: "unknown",
        status: "completed",
        roadmapRequested: false,
        bookingEmailSent: false,
        startedAt: Date.now(),
        completedAt: Date.now(),
        summary: args.summary,
        durationSeconds: args.durationSeconds,
        recordingUrl: args.recordingUrl,
        publicLogUrl: args.publicLogUrl,
      });
      return id;
    }

    await ctx.db.patch(conversation._id, {
      status: "completed",
      completedAt: Date.now(),
      summary: args.summary,
      durationSeconds: args.durationSeconds,
      recordingUrl: args.recordingUrl,
      publicLogUrl: args.publicLogUrl,
    });
    return conversation._id;
  },
});

// HUBSPOT INTEGRATION POINT: after completeConversation, schedule action to sync to HubSpot

export const updateConversationOutcome = internalMutation({
  args: {
    retellCallId: v.string(),
    summary: v.optional(v.string()),
    visitorEmail: v.optional(v.string()),
    visitorName: v.optional(v.string()),
    painPoints: v.optional(v.array(v.string())),
    qualificationScore: v.optional(v.number()),
    outcome: v.optional(v.string()),
    roadmapRequested: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let conversation = await ctx.db
      .query("conversations")
      .withIndex("by_retellCallId", (q) => q.eq("retellCallId", args.retellCallId))
      .first();

    // Defensive creation: if call_analyzed arrives before call_started
    if (!conversation) {
      const id = await ctx.db.insert("conversations", {
        retellCallId: args.retellCallId,
        modality: "voice",
        agentId: "unknown",
        status: "active",
        roadmapRequested: args.roadmapRequested ?? false,
        bookingEmailSent: false,
        startedAt: Date.now(),
        summary: args.summary,
        visitorEmail: args.visitorEmail,
        visitorName: args.visitorName,
        painPoints: args.painPoints,
        qualificationScore: args.qualificationScore,
        outcome: args.outcome,
        roadmapStatus: args.roadmapRequested ? "pending" : undefined,
      });
      conversation = (await ctx.db.get(id))!;
    } else {
      await ctx.db.patch(conversation._id, {
        summary: args.summary ?? conversation.summary,
        visitorEmail: args.visitorEmail,
        visitorName: args.visitorName,
        painPoints: args.painPoints,
        qualificationScore: args.qualificationScore,
        outcome: args.outcome,
        roadmapRequested: args.roadmapRequested ?? conversation.roadmapRequested,
        roadmapStatus: args.roadmapRequested ? "pending" : conversation.roadmapStatus,
      });
    }

    // Link to existing lead or create new one
    if (args.visitorEmail) {
      const existingLead = await ctx.db
        .query("leads")
        .withIndex("by_email", (q) => q.eq("email", args.visitorEmail!))
        .first();

      if (existingLead) {
        await ctx.db.patch(conversation._id, { leadId: existingLead._id });
      } else {
        const leadId: typeof conversation.leadId = await ctx.runMutation(
          internal.conversations.createLeadFromConversation,
          {
            email: args.visitorEmail,
            name: args.visitorName,
          }
        );
        await ctx.db.patch(conversation._id, { leadId });
      }
    }

    return conversation._id;
  },
});

export const createLeadFromConversation = internalMutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const score = scoreLead("retell-agent");
    return await ctx.db.insert("leads", {
      email: args.email,
      name: args.name,
      source: "retell-agent",
      score,
      createdAt: Date.now(),
    });
  },
});

export const flagRoadmapRequest = internalMutation({
  args: {
    retellCallId: v.string(),
  },
  handler: async (ctx, args) => {
    const conversation = await ctx.db
      .query("conversations")
      .withIndex("by_retellCallId", (q) => q.eq("retellCallId", args.retellCallId))
      .first();
    if (!conversation) return;

    await ctx.db.patch(conversation._id, {
      roadmapRequested: true,
      roadmapStatus: "pending",
    });
  },
});

// --- Admin-facing mutations/queries ---

export const updateRoadmapStatus = mutation({
  args: {
    conversationId: v.id("conversations"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    await ctx.db.patch(args.conversationId, {
      roadmapStatus: args.status,
    });
  },
});

export const listConversations = query({
  args: {
    outcome: v.optional(v.string()),
    roadmapStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    if (args.outcome) {
      return await ctx.db
        .query("conversations")
        .withIndex("by_outcome", (q) => q.eq("outcome", args.outcome!))
        .order("desc")
        .take(50);
    }

    if (args.roadmapStatus) {
      return await ctx.db
        .query("conversations")
        .withIndex("by_roadmapStatus", (q) => q.eq("roadmapStatus", args.roadmapStatus!))
        .order("desc")
        .take(50);
    }

    return await ctx.db
      .query("conversations")
      .order("desc")
      .take(50);
  },
});

export const getConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new ConvexError("Conversation not found");
    }

    const messages = await ctx.db
      .query("conversationMessages")
      .withIndex("by_conversationId_timestamp", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .take(500);

    return { ...conversation, messages };
  },
});

export const listPendingRoadmaps = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_roadmapStatus", (q) => q.eq("roadmapStatus", "pending"))
      .order("asc")
      .take(50);

    // Defensive JS filter for roadmapRequested=true
    return conversations.filter((c) => c.roadmapRequested === true);
  },
});
