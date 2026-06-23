import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./lib/auth";

const SOURCE = "ecommerce-tools-application";

/**
 * Public: turn a (free) intake-chat session into an application. Creates/links a
 * lead, snapshots the extracted intake profile, and schedules the background
 * processor that drafts the free-value deliverable + the internal proposal.
 * Free to submit — Clerk account is created client-side before this is called.
 */
export const submitApplication = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email || !email.includes("@")) throw new Error("Valid email required");

    // Lead upsert (dedupe by email, re-link clerkUserId/sessionId) — mirrors
    // leads.createLead so a pre-auth lead binds to the account.
    const existingLead = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    let leadId;
    if (existingLead) {
      await ctx.db.patch(existingLead._id, {
        clerkUserId: args.clerkUserId ?? existingLead.clerkUserId,
        sessionId: args.sessionId ?? existingLead.sessionId,
        name: args.name ?? existingLead.name,
      });
      leadId = existingLead._id;
    } else {
      leadId = await ctx.db.insert("leads", {
        email,
        name: args.name,
        source: SOURCE,
        score: 0,
        sessionId: args.sessionId,
        clerkUserId: args.clerkUserId,
        createdAt: Date.now(),
      });
    }

    // Snapshot the intake profile captured during the chat.
    let intakeProfile: unknown = undefined;
    if (args.sessionId) {
      const session = await ctx.db
        .query("agentSessions")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId!))
        .first();
      intakeProfile = session?.intakeProfile;
    }

    const applicationId = await ctx.db.insert("applications", {
      email,
      name: args.name,
      sessionId: args.sessionId,
      leadId,
      clerkUserId: args.clerkUserId,
      source: SOURCE,
      intakeProfile,
      status: "new",
      followupEmailSent: false,
      createdAt: Date.now(),
    });

    // Kick off the heavy background work (drafting) — does not block the user.
    await ctx.scheduler.runAfter(0, internal.intakeProcessor.processApplication, {
      applicationId,
    });

    return { applicationId };
  },
});

/** Public: lightweight status poll for the client. Never exposes internal fields. */
export const getApplicationStatusBySession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const app = await ctx.db
      .query("applications")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
    if (!app) return null;
    return {
      applicationId: app._id,
      status: app.status,
      followupEmailSent: app.followupEmailSent,
      hasFreeValue: !!app.freeValue,
    };
  },
});

// --- Internal (background processor) ---

export const internalGetApplication = internalQuery({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.applicationId);
    if (!app) return null;
    let preDraft: string | undefined;
    if (app.sessionId) {
      const session = await ctx.db
        .query("agentSessions")
        .withIndex("by_sessionId", (q) => q.eq("sessionId", app.sessionId!))
        .first();
      preDraft = session?.preDraft;
    }
    return { app, preDraft };
  },
});

export const internalStoreResults = internalMutation({
  args: {
    applicationId: v.id("applications"),
    freeValue: v.string(),
    internalProposal: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.applicationId, {
      freeValue: args.freeValue,
      internalProposal: args.internalProposal,
      internalProposalAt: Date.now(),
      status: "processed",
    });
  },
});

export const internalMarkFollowupSent = internalMutation({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.applicationId, { followupEmailSent: true });
  },
});

export const internalSetError = internalMutation({
  args: { applicationId: v.id("applications"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.applicationId, { processingError: args.error });
  },
});

// --- Admin ---

export const adminListApplications = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const rows = args.status
      ? await ctx.db
          .query("applications")
          .withIndex("by_status", (q) => q.eq("status", args.status!))
          .order("desc")
          .take(50)
      : await ctx.db.query("applications").order("desc").take(50);
    return rows;
  },
});

export const adminGetApplication = query({
  args: { applicationId: v.id("applications") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    return await ctx.db.get(args.applicationId);
  },
});

/** Admin: save/overwrite the internal next-steps proposal (never sent to user). */
export const saveInternalProposal = mutation({
  args: { applicationId: v.id("applications"), internalProposal: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    await ctx.db.patch(args.applicationId, {
      internalProposal: args.internalProposal,
      internalProposalAt: Date.now(),
      status: "proposed",
    });
  },
});

export const setApplicationStatus = mutation({
  args: { applicationId: v.id("applications"), status: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    await ctx.db.patch(args.applicationId, { status: args.status });
  },
});
