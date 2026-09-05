import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole } from "./lib/auth";
import {
  DISCOVERY_QUESTIONS,
  DISCOVERY_STAGE,
} from "../src/content/discovery-questions";

/**
 * Ownership. A session is capability-protected until someone claims it, and
 * identity-protected afterwards.
 *
 * Anonymous visitors have no identity, so an unclaimed session has to stay
 * reachable by whoever holds its id — that is the existing behaviour and the
 * only way the assessment works signed-out. The moment a signed-in visitor
 * binds it, possession of the id stops being enough: the transcript carries
 * their revenue, their hours and what they are worried about, and the id is
 * `Math.random()`-derived, not a secret.
 *
 * Binding is therefore one-way, and this guard is the whole of the model.
 *
 * NOT applied to `internalGetSession` / `internalStorePreDraft`: those run from
 * the scheduler and actions, which carry no user identity by construction.
 */
async function assertMayUseSession(
  ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } },
  session: { clerkUserId?: string }
): Promise<void> {
  if (!session.clerkUserId) return;
  const identity = await ctx.auth.getUserIdentity();
  if (!identity || identity.subject !== session.clerkUserId) {
    throw new ConvexError("This assessment belongs to another account");
  }
}

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
    await assertMayUseSession(ctx, session);
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
    if (existing) {
      await assertMayUseSession(ctx, existing);
      return existing;
    }

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
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) return null;
    await assertMayUseSession(ctx, session);
    return session;
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
    await assertMayUseSession(ctx, session);
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
    await assertMayUseSession(ctx, session);
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
    await assertMayUseSession(ctx, session);
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
    await assertMayUseSession(ctx, session);
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
    await assertMayUseSession(ctx, session);

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
    await assertMayUseSession(ctx, session);
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
    await assertMayUseSession(ctx, session);
    await ctx.db.patch(session._id, {
      intakeProfile: args.intakeProfile,
      intakeReady: args.ready ?? session.intakeReady,
    });
  },
});

// --- Discovery assessment agent ---

// Persist the server-owned stage state after each turn. Only the Next.js chat
// route writes this, after clamping the model's claim (see
// src/lib/agent/discovery-prompt.ts); the client never sends it.
export const updateDiscoveryState = mutation({
  args: {
    sessionId: v.string(),
    discoveryState: v.any(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) return;
    await assertMayUseSession(ctx, session);
    await ctx.db.patch(session._id, { discoveryState: args.discoveryState });
  },
});

/**
 * Bind an in-progress conversation to the signed-in account.
 *
 * Distinct from `discoveryAssessments.claim`, which binds the finished *report*
 * and only exists once `submit` has written an `assessments` row. This one runs
 * mid-conversation, so the visitor who signs up at question three keeps their
 * answers instead of leaving them attached to a browser tab.
 *
 * The identity comes from `ctx.auth`, never from an argument: a client that
 * could name the owner could hand someone else's conversation to itself.
 */
export const bindToAccount = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");

    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) throw new ConvexError("Session not found");

    if (session.clerkUserId && session.clerkUserId !== identity.subject) {
      throw new ConvexError("This assessment belongs to another account");
    }
    if (!session.clerkUserId) {
      await ctx.db.patch(session._id, { clerkUserId: identity.subject });
    }
    return { bound: true as const };
  },
});

/**
 * Whether the caller may bind this session — and nothing else.
 *
 * Returns no session content, so the binding hook can run on every page for
 * every signed-in visitor without becoming another way to read a transcript.
 * `exists` is the signal the hook waits on: it flips false to true when the
 * assessment component inserts the row, which removes the ordering race
 * without a retry loop.
 */
export const bindStatus = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) {
      return { exists: false, boundToMe: false, boundToOther: false };
    }
    return {
      exists: true,
      boundToMe: session.clerkUserId === identity.subject,
      boundToOther:
        Boolean(session.clerkUserId) && session.clerkUserId !== identity.subject,
    };
  },
});

/**
 * The signed-in visitor's unfinished discovery assessments, for the portal.
 *
 * Reads the index seeded from `identity.subject`, so there is no argument to
 * tamper with and it cannot return another account's rows by construction.
 *
 * `turnCount >= 2` is load-bearing: `getOrCreate` fires on every homepage mount,
 * so a signed-in visitor who merely scrolls past the assessment gets a row. The
 * opening anchor question is itself persisted as one message, so 2 is the first
 * count that means the visitor actually answered something.
 */
export const portalListUnfinished = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const rows = await ctx.db
      .query("agentSessions")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .order("desc")
      .take(50);

    return rows
      .filter(
        (r) =>
          r.agentKind === "discovery-assessment" &&
          r.status === "active" &&
          r.turnCount >= 2 &&
          discoveryStage(r.discoveryState) < DISCOVERY_STAGE.SUBMITTED
      )
      .slice(0, 10)
      .map((r) => {
        const state = r.discoveryState as
          | { answers?: { problem?: { summary?: string } } }
          | undefined;
        const problem = state?.answers?.problem?.summary?.trim();
        return {
          sessionId: r.sessionId,
          stage: discoveryStage(r.discoveryState),
          questionCount: DISCOVERY_QUESTIONS.length,
          problem: problem ? problem.slice(0, 240) : null,
          startedAt: r.startedAt,
        };
      });
  },
});

/** `discoveryState` is stored as `v.any()`, so never trust its shape. */
function discoveryStage(raw: unknown): number {
  const stage = (raw as { stage?: unknown } | undefined)?.stage;
  if (typeof stage !== "number" || !Number.isFinite(stage)) return 0;
  return Math.max(0, Math.min(DISCOVERY_STAGE.SUBMITTED, Math.floor(stage)));
}

// Start the background "pre-draft" once context is rich enough — runs while the
// user is still chatting, without blocking their input. Idempotent.
export const kickoffPreDraft = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("agentSessions")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    if (!session) return;
    await assertMayUseSession(ctx, session);
    if (session.preDraftStarted || !session.intakeReady) return;
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
