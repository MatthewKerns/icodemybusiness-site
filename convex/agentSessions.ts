import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./lib/auth";

const MAX_FILES_PER_SESSION = 5;
const MAX_TOTAL_BYTES_PER_SESSION = 15 * 1024 * 1024;
const MAX_TURNS = 30;

const issueValidator = v.object({
  title: v.string(),
  severity: v.string(),
  evidence: v.string(),
});

const fileMetaValidator = v.object({
  storageId: v.id("_storage"),
  name: v.string(),
  size: v.number(),
  mime: v.string(),
  extractedChars: v.number(),
});

export const generateUploadUrl = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) throw new Error("Session not found");
    if (session.fileIds.length >= MAX_FILES_PER_SESSION) {
      throw new Error(`Too many files (max ${MAX_FILES_PER_SESSION})`);
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const getOrCreate = mutation({
  args: {
    sessionId: v.string(),
    agentKind: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (existing) return existing;

    const id = await ctx.db.insert("agentSessions", {
      agentKind: args.agentKind,
      sessionId: args.sessionId,
      status: "active",
      fileIds: [],
      fileMeta: [],
      turnCount: 0,
      summaryEmailSent: false,
      source: args.source,
      startedAt: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

export const getBySessionId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
  },
});

export const listMessages = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) return [];
    return await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_sessionId_timestamp", (q) =>
        q.eq("sessionId", session._id)
      )
      .take(200);
  },
});

export const appendMessage = mutation({
  args: {
    sessionId: v.string(),
    role: v.string(),
    content: v.string(),
    fileRefs: v.optional(v.array(v.id("_storage"))),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) throw new Error("Session not found");
    if (session.turnCount >= MAX_TURNS * 2) {
      throw new Error("Session turn limit exceeded");
    }
    await ctx.db.insert("agentSessionMessages", {
      sessionId: session._id,
      role: args.role,
      content: args.content,
      fileRefs: args.fileRefs,
      timestamp: Date.now(),
    });
    await ctx.db.patch(session._id, { turnCount: session.turnCount + 1 });
  },
});

export const updateTop3 = mutation({
  args: {
    sessionId: v.string(),
    top3Issues: v.array(issueValidator),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) return;
    await ctx.db.patch(session._id, { top3Issues: args.top3Issues });
  },
});

export const attachFile = mutation({
  args: {
    sessionId: v.string(),
    file: fileMetaValidator,
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) throw new Error("Session not found");
    if (session.fileIds.length >= MAX_FILES_PER_SESSION) {
      throw new Error(
        `Too many files attached (max ${MAX_FILES_PER_SESSION})`
      );
    }
    const totalBytes =
      session.fileMeta.reduce((sum, f) => sum + f.size, 0) + args.file.size;
    if (totalBytes > MAX_TOTAL_BYTES_PER_SESSION) {
      throw new Error("Total upload size exceeded");
    }
    await ctx.db.patch(session._id, {
      fileIds: [...session.fileIds, args.file.storageId],
      fileMeta: [...session.fileMeta, args.file],
    });
  },
});

export const completeSession = mutation({
  args: {
    sessionId: v.string(),
    visitorEmail: v.string(),
    visitorName: v.optional(v.string()),
    top3Issues: v.array(issueValidator),
    leadId: v.optional(v.id("leads")),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) throw new Error("Session not found");

    await ctx.db.patch(session._id, {
      status: "completed",
      completedAt: Date.now(),
      visitorEmail: args.visitorEmail,
      visitorName: args.visitorName,
      top3Issues: args.top3Issues,
      leadId: args.leadId,
      summaryEmailSent: true,
    });
  },
});

export const getForServer = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) return null;
    const messages = await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_sessionId_timestamp", (q) =>
        q.eq("sessionId", session._id)
      )
      .take(200);
    return { session, messages };
  },
});

// --- E-commerce intake agent ---

// Persist the structured intake profile the chat agent extracts each turn.
export const updateIntakeProfile = mutation({
  args: {
    sessionId: v.string(),
    intakeProfile: v.any(),
    ready: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) return;
    await ctx.db.patch(session._id, {
      intakeProfile: args.intakeProfile,
      intakeReady: args.ready ?? session.intakeReady,
    });
  },
});

// Start the background "pre-draft" once context is rich enough — runs while the
// user is still chatting, without blocking their input. Idempotent.
export const kickoffPreDraft = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session || session.preDraftStarted || !session.intakeReady) return;
    await ctx.db.patch(session._id, { preDraftStarted: true });
    await ctx.scheduler.runAfter(0, internal.intakeProcessor.preDraft, {
      sessionId: args.sessionId,
    });
  },
});

// Internal: read a session for the background processor (action runtime).
export const internalGetSession = internalQuery({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) return null;
    const messages = await ctx.db
      .query("agentSessionMessages")
      .withIndex("by_sessionId_timestamp", (q) =>
        q.eq("sessionId", session._id)
      )
      .take(200);
    return { session, messages };
  },
});

// Internal: store the background pre-draft analysis on the session.
export const internalStorePreDraft = internalMutation({
  args: { sessionId: v.string(), preDraft: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) return;
    await ctx.db.patch(session._id, { preDraft: args.preDraft });
  },
});

// Admin
export const adminListSessions = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    if (args.status) {
      return await ctx.db
        .query("agentSessions")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(50);
    }
    return await ctx.db.query("agentSessions").order("desc").take(50);
  },
});
