import { v, ConvexError } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { requireRole } from "./lib/auth";
import { rateLimit } from "./lib/rateLimits";
import { scoreLead } from "./lib/leadScoring";
import { validateEmail } from "./lib/validators";
import {
  DISCOVERY_QUESTIONS,
  DISCOVERY_STAGE,
} from "../src/content/discovery-questions";

const SOURCE = "discovery-assessment";
const AGENT_KIND = "discovery-assessment";

const answerValidator = v.object({
  key: v.string(),
  question: v.string(),
  summary: v.string(),
  quotes: v.array(v.string()),
  numbers: v.optional(v.any()),
});

const summaryValidator = v.object({
  problem: v.string(),
  impact: v.string(),
  history: v.string(),
  stakes: v.string(),
  idealOutcome: v.string(),
  recommendedPath: v.string(),
  thisWeekAction: v.string(),
});

/**
 * The visitor-facing shape. Built field by field on purpose: `internalBrief`
 * must never leak, and an explicit projection cannot leak it by accident the
 * way a spread would.
 */
function publicView(doc: Doc<"assessments">) {
  return {
    _id: doc._id,
    sessionId: doc.sessionId,
    email: doc.email,
    name: doc.name,
    answers: doc.answers,
    summary: doc.summary,
    status: doc.status,
    emailSent: doc.emailSent,
    claimed: Boolean(doc.clerkUserId),
    createdAt: doc.createdAt,
    completedAt: doc.completedAt,
  };
}

async function sessionFor(
  ctx: { db: import("./_generated/server").DatabaseReader },
  sessionId: string
) {
  return await ctx.db
    .query("agentSessions")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .first();
}

async function assessmentFor(
  ctx: { db: import("./_generated/server").DatabaseReader },
  sessionId: string
) {
  return await ctx.db
    .query("assessments")
    .withIndex("by_sessionId", (q) => q.eq("sessionId", sessionId))
    .order("desc")
    .first();
}

/**
 * Public: the visitor confirmed the recap. Only legal from the recap stage;
 * the chat route owns every other transition.
 */
export const confirmRecap = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const session = await sessionFor(ctx, args.sessionId);
    if (!session || session.agentKind !== AGENT_KIND) {
      throw new ConvexError("Session not found");
    }
    const state = (session.discoveryState ?? {}) as {
      stage?: number;
      recapConfirmed?: boolean;
    };
    if (state.stage !== DISCOVERY_STAGE.RECAP) {
      throw new ConvexError("The assessment isn't at the recap yet");
    }
    await ctx.db.patch(session._id, {
      discoveryState: { ...state, recapConfirmed: true },
    });
  },
});

/**
 * Public: turn a confirmed discovery session into an assessment. Upserts the
 * lead, snapshots the five answers, and schedules the background processor
 * that writes the visitor summary + internal brief and sends the email.
 *
 * `clerkUserId` is taken from the verified identity when present, never from
 * the client.
 */
export const submit = mutation({
  args: {
    sessionId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = validateEmail(args.email);
    const name = args.name?.trim() || undefined;

    const session = await sessionFor(ctx, args.sessionId);
    if (!session || session.agentKind !== AGENT_KIND) {
      throw new ConvexError("Session not found");
    }
    const state = (session.discoveryState ?? {}) as {
      stage?: number;
      answers?: Record<
        string,
        { summary?: string; quotes?: string[]; numbers?: unknown }
      >;
      recapConfirmed?: boolean;
      correction?: string;
    };
    if (state.recapConfirmed !== true) {
      throw new ConvexError("Confirm the recap before submitting");
    }

    // Idempotent: a double-click or a re-mount after the sign-up redirect must
    // not create a second report.
    const existing = await assessmentFor(ctx, args.sessionId);
    if (existing) return existing._id;

    const { ok, retryAt } = await rateLimit(ctx, {
      name: "emailCapture",
      key: `${args.sessionId}:${email}`,
    });
    if (!ok) {
      throw new ConvexError({
        kind: "RateLimited" as const,
        message: "Too many attempts. Please try again in a moment.",
        retryAt: retryAt ?? Date.now() + 60_000,
      });
    }

    const identity = await ctx.auth.getUserIdentity();
    const clerkUserId = identity?.subject;

    // Lead upsert — mirrors leads.createLead / applications.submitApplication.
    // A mutation cannot call another mutation, so the logic is inlined.
    const existingLead = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    let leadId;
    if (existingLead) {
      await ctx.db.patch(existingLead._id, {
        sessionId: args.sessionId,
        clerkUserId: clerkUserId ?? existingLead.clerkUserId,
        name: name ?? existingLead.name,
      });
      leadId = existingLead._id;
    } else {
      leadId = await ctx.db.insert("leads", {
        email,
        name,
        source: SOURCE,
        score: scoreLead(SOURCE),
        sessionId: args.sessionId,
        clerkUserId,
        createdAt: Date.now(),
      });
    }

    const answers: {
      key: string;
      question: string;
      summary: string;
      quotes: string[];
      numbers: unknown;
    }[] = DISCOVERY_QUESTIONS.map((q) => {
      const a = state.answers?.[q.key];
      return {
        key: q.key,
        question: q.anchor,
        summary: a?.summary?.trim() || "Not captured",
        quotes: Array.isArray(a?.quotes)
          ? a!.quotes!.filter((s) => typeof s === "string")
          : [],
        numbers: a?.numbers,
      };
    });

    if (typeof state.correction === "string" && state.correction.trim()) {
      answers.push({
        key: "correction",
        question: "What the recap got wrong, in your words",
        summary: state.correction.trim(),
        quotes: [],
        numbers: undefined,
      });
    }

    const now = Date.now();
    const assessmentId = await ctx.db.insert("assessments", {
      sessionId: args.sessionId,
      leadId,
      clerkUserId,
      email,
      name,
      answers,
      status: "processing",
      emailSent: false,
      source: args.source ?? session.source,
      createdAt: now,
    });

    await ctx.db.patch(session._id, {
      status: "completed",
      completedAt: now,
      visitorEmail: email,
      visitorName: name,
      leadId,
      discoveryState: { ...state, stage: DISCOVERY_STAGE.SUBMITTED },
    });

    await ctx.scheduler.runAfter(
      0,
      internal.discoveryProcessor.finalizeAssessment,
      { assessmentId }
    );

    return assessmentId;
  },
});

/** Public: the visitor's own report by session. Never includes the brief. */
export const getBySessionId = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const doc = await assessmentFor(ctx, args.sessionId);
    return doc ? publicView(doc) : null;
  },
});

/**
 * Public: bind the report (and its lead) to the signed-in account so it shows
 * in the portal. The user id comes only from the verified identity.
 */
export const claim = mutation({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");

    const doc = await assessmentFor(ctx, args.sessionId);
    if (!doc) throw new ConvexError("Assessment not found");
    if (doc.clerkUserId && doc.clerkUserId !== identity.subject) {
      throw new ConvexError("This report belongs to another account");
    }
    if (!doc.clerkUserId) {
      await ctx.db.patch(doc._id, { clerkUserId: identity.subject });
    }
    if (doc.leadId) {
      const lead = await ctx.db.get(doc.leadId);
      if (lead && lead.clerkUserId !== identity.subject) {
        await ctx.db.patch(lead._id, { clerkUserId: identity.subject });
      }
    }
    return { claimed: true as const };
  },
});

/** Public (signed in): the reports bound to this account, newest first. */
export const portalListForUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const docs = await ctx.db
      .query("assessments")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .order("desc")
      .take(20);
    return docs.map(publicView);
  },
});

// --- Admin ------------------------------------------------------------------

export const adminListAssessments = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    if (args.status) {
      return await ctx.db
        .query("assessments")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(100);
    }
    return await ctx.db.query("assessments").order("desc").take(100);
  },
});

export const adminGetAssessment = query({
  args: { assessmentId: v.id("assessments") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    return await ctx.db.get(args.assessmentId);
  },
});

export const saveInternalBrief = mutation({
  args: { assessmentId: v.id("assessments"), internalBrief: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    await ctx.db.patch(args.assessmentId, {
      internalBrief: args.internalBrief,
      internalBriefAt: Date.now(),
    });
  },
});

export const setAssessmentStatus = mutation({
  args: { assessmentId: v.id("assessments"), status: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    await ctx.db.patch(args.assessmentId, { status: args.status });
  },
});

// --- Internal (background processor) ----------------------------------------

export const internalGetForFinalize = internalQuery({
  args: { assessmentId: v.id("assessments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.assessmentId);
  },
});

export const internalStoreFinalResult = internalMutation({
  args: {
    assessmentId: v.id("assessments"),
    summary: summaryValidator,
    internalBrief: v.string(),
    processingError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      summary: args.summary,
      internalBrief: args.internalBrief,
      internalBriefAt: Date.now(),
      processingError: args.processingError,
      status: "ready",
      completedAt: Date.now(),
    });
  },
});

export const internalMarkEmailSent = internalMutation({
  args: { assessmentId: v.id("assessments") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, {
      emailSent: true,
      emailSentAt: Date.now(),
    });
  },
});

export const internalSetError = internalMutation({
  args: { assessmentId: v.id("assessments"), error: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assessmentId, { processingError: args.error });
  },
});

export const answerValidatorForTests = answerValidator;
