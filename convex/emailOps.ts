/**
 * The read side and the owner's controls for /admin/email.
 *
 * One place that joins what the site already records — leads, transactional
 * sends, Resend callbacks, suppressions, sequence enrollments — with the
 * outbound tables, so the dashboard reads the same rows the site writes.
 * Everything here is owner-only and every scan is bounded; a hit on a cap is
 * returned as `truncated`, never hidden.
 */

import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { requireOwner } from "./lib/auth";
import { validateEmail } from "./lib/validators";
import { sequencesPaused } from "./lib/suppression";
import { TRACKS, isStepAuthored } from "./lib/sequenceTracks";
import {
  BACKUP_INBOX_MAX,
  BACKUP_INBOX_MIN,
  NEEDS_ANSWER_CATEGORIES,
  PIPELINE_STAGES,
  POSITIVE_REPLY_CATEGORIES,
  isBackupInbox,
  pipelineStage,
  replyCategory,
  type PipelineStage,
} from "./lib/pipeline";

const DAY_MS = 86_400_000;
const MAX_ROWS = 5_000;
const MAX_PEOPLE = 500;

function clampWindow(days: number | undefined): number {
  return Math.min(365, Math.max(1, Math.floor(days ?? 30)));
}

function tally<K extends string>(keys: readonly K[]): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const k of keys) out[k] = 0;
  return out;
}

/** Engagement for one address, from the Resend callbacks stored for it. */
async function engagementFor(ctx: QueryCtx, email: string) {
  const events = await ctx.db
    .query("emailEvents")
    .withIndex("by_email", (q) => q.eq("email", email))
    .take(200);
  let delivered = false;
  let opened = false;
  let clicked = false;
  let bounced = false;
  for (const e of events) {
    if (e.type === "email.delivered") delivered = true;
    else if (e.type === "email.opened") opened = true;
    else if (e.type === "email.clicked") clicked = true;
    else if (e.type === "email.bounced" || e.type === "email.complained") bounced = true;
  }
  return { delivered, opened, clicked, bounced };
}

async function liveSuppression(ctx: QueryCtx, email: string) {
  const rows = await ctx.db
    .query("emailSuppressions")
    .withIndex("by_email", (q) => q.eq("email", email))
    .take(20);
  return rows.find((r) => r.revokedAt === undefined) ?? null;
}

/**
 * Everything the Overview tab shows, for one window. Counts only — no
 * addresses — so it is cheap to keep subscribed.
 */
export const overview = query({
  args: { windowDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const windowDays = clampWindow(args.windowDays);
    const until = Date.now();
    const since = until - windowDays * DAY_MS;

    const leads = await ctx.db.query("leads").order("desc").take(MAX_ROWS);
    const leadsByStage = tally(PIPELINE_STAGES);
    const leadsBySource: Record<string, number> = {};
    let leadsInWindow = 0;
    let consented = 0;
    for (const l of leads) {
      leadsByStage[l.stage ?? "new"]++;
      if (l.consentedAt !== undefined) consented++;
      if (l.createdAt >= since) {
        leadsInWindow++;
        const key = l.source ?? "unknown";
        leadsBySource[key] = (leadsBySource[key] ?? 0) + 1;
      }
    }

    const sends = await ctx.db
      .query("emailSends")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", since))
      .take(MAX_ROWS);
    let sent = 0;
    let failed = 0;
    const byTemplate: Record<string, { sent: number; failed: number }> = {};
    for (const s of sends) {
      const t = (byTemplate[s.template] ??= { sent: 0, failed: 0 });
      if (s.status === "sent") {
        sent++;
        t.sent++;
      } else {
        failed++;
        t.failed++;
      }
    }

    const events = await ctx.db
      .query("emailEvents")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", since))
      .take(MAX_ROWS);
    // Counted per message, not per callback: one email opened five times is
    // one open.
    const perType: Record<string, Set<string>> = {};
    for (const e of events) (perType[e.type] ??= new Set()).add(e.resendId);
    const n = (type: string) => perType[type]?.size ?? 0;
    const lastEvent = await ctx.db
      .query("emailEvents")
      .withIndex("by_createdAt")
      .order("desc")
      .first();

    const suppressions = await ctx.db.query("emailSuppressions").take(MAX_ROWS);
    const suppressedByReason: Record<string, number> = {};
    for (const s of suppressions) {
      if (s.revokedAt !== undefined) continue;
      suppressedByReason[s.reason] = (suppressedByReason[s.reason] ?? 0) + 1;
    }

    const enrollments = await ctx.db.query("sequenceEnrollments").take(MAX_ROWS);
    const enrollmentsByStatus = { active: 0, paused: 0, exited: 0 };
    for (const e of enrollments) enrollmentsByStatus[e.status]++;
    let stepsTotal = 0;
    let stepsAuthored = 0;
    for (const track of Object.values(TRACKS)) {
      for (const step of track.steps) {
        stepsTotal++;
        if (isStepAuthored(step)) stepsAuthored++;
      }
    }

    const campaigns = await ctx.db.query("outboundCampaigns").take(MAX_ROWS);
    const campaignsByStatus = { draft: 0, live: 0, paused: 0, done: 0 };
    let reportedSent = 0;
    let reportedBounced = 0;
    for (const c of campaigns) {
      campaignsByStatus[c.status]++;
      reportedSent += c.reportedSent ?? 0;
      reportedBounced += c.reportedBounced ?? 0;
    }

    const prospects = await ctx.db.query("outboundProspects").take(MAX_ROWS);
    const prospectsByStage = tally(PIPELINE_STAGES);
    for (const p of prospects) prospectsByStage[p.stage]++;

    const replies = await ctx.db
      .query("outboundReplies")
      .withIndex("by_createdAt", (q) => q.gte("createdAt", since))
      .take(MAX_ROWS);
    const repliesByCategory: Record<string, number> = {};
    for (const r of replies) {
      repliesByCategory[r.category] = (repliesByCategory[r.category] ?? 0) + 1;
    }
    // "Needs a reply" is not windowed: an old unanswered reply is still owed.
    const allReplies = await ctx.db.query("outboundReplies").take(MAX_ROWS);
    const repliesUnhandled = allReplies.filter((r) => r.handledAt === undefined).length;

    const inboxes = await ctx.db.query("sendingInboxes").take(MAX_ROWS);
    const inboxesByStatus: Record<string, number> = {};
    let backups = 0;
    for (const i of inboxes) {
      inboxesByStatus[i.status] = (inboxesByStatus[i.status] ?? 0) + 1;
      if (isBackupInbox(i.status)) backups++;
    }

    return {
      window: { days: windowDays, since, until },
      leads: {
        total: leads.length,
        inWindow: leadsInWindow,
        consented,
        byStage: leadsByStage,
        bySource: leadsBySource,
      },
      sends: { sent, failed, byTemplate },
      engagement: {
        delivered: n("email.delivered"),
        opened: n("email.opened"),
        clicked: n("email.clicked"),
        bounced: n("email.bounced"),
        complained: n("email.complained"),
        callbacks: events.length,
        lastCallbackAt: lastEvent?.createdAt ?? null,
      },
      suppressions: { byReason: suppressedByReason },
      sequences: {
        paused: await sequencesPaused(ctx),
        enrollments: enrollmentsByStatus,
        stepsTotal,
        stepsAuthored,
      },
      outbound: {
        campaigns: campaignsByStatus,
        reportedSent,
        reportedBounced,
        prospects: { total: prospects.length, byStage: prospectsByStage },
        replies: { inWindow: replies.length, byCategory: repliesByCategory, unhandled: repliesUnhandled },
      },
      inboxes: {
        total: inboxes.length,
        byStatus: inboxesByStatus,
        backups,
        backupMin: BACKUP_INBOX_MIN,
        backupMax: BACKUP_INBOX_MAX,
      },
      // Names only, as booleans: whether each piece of plumbing has what it
      // needs. Values never leave the server.
      setup: {
        resendApiKey: Boolean(process.env.RESEND_API_KEY),
        resendFromEmail: Boolean(process.env.RESEND_FROM_EMAIL),
        resendWebhookSecret: Boolean(process.env.RESEND_WEBHOOK_SECRET),
        unsubscribeSecret: Boolean(process.env.UNSUBSCRIBE_SECRET),
        mailingAddress: Boolean(process.env.MAILING_ADDRESS),
      },
      truncated:
        leads.length === MAX_ROWS ||
        sends.length === MAX_ROWS ||
        events.length === MAX_ROWS ||
        prospects.length === MAX_ROWS,
    };
  },
});

export interface PersonRow {
  kind: "lead" | "prospect";
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  /** Lead source, or the campaign name for a prospect. */
  origin: string;
  stage: PipelineStage;
  createdAt: number;
  consented: boolean;
  emailsSent: number;
  lastSentAt: number | null;
  opened: boolean;
  clicked: boolean;
  bounced: boolean;
  suppressed: boolean;
  track: string | null;
  openReplies: number;
}

/**
 * One row per person in the pipeline — site leads and outbound prospects
 * together, newest first — with what has been sent to them and what came back.
 */
export const listPeople = query({
  args: {},
  handler: async (ctx): Promise<{ people: PersonRow[]; truncated: boolean }> => {
    await requireOwner(ctx);

    const leads = await ctx.db.query("leads").order("desc").take(MAX_PEOPLE);
    const prospects = await ctx.db
      .query("outboundProspects")
      .withIndex("by_createdAt")
      .order("desc")
      .take(MAX_PEOPLE);

    const campaignNames = new Map<Id<"outboundCampaigns">, string>();
    for (const c of await ctx.db.query("outboundCampaigns").take(MAX_ROWS)) {
      campaignNames.set(c._id, c.name);
    }

    const openRepliesFor = async (email: string) => {
      const rows = await ctx.db
        .query("outboundReplies")
        .withIndex("by_email", (q) => q.eq("email", email))
        .take(50);
      return rows.filter((r) => r.handledAt === undefined).length;
    };

    const people: PersonRow[] = [];

    for (const l of leads) {
      const sends = await ctx.db
        .query("emailSends")
        .withIndex("by_to", (q) => q.eq("to", l.email))
        .order("desc")
        .take(50);
      const sentRows = sends.filter((s) => s.status === "sent");
      const enrollments = await ctx.db
        .query("sequenceEnrollments")
        .withIndex("by_email", (q) => q.eq("email", l.email))
        .take(10);
      const engagement = await engagementFor(ctx, l.email);
      people.push({
        kind: "lead",
        id: l._id,
        email: l.email,
        name: l.name ?? null,
        company: null,
        origin: l.source ?? "unknown",
        stage: l.stage ?? "new",
        createdAt: l.createdAt,
        consented: l.consentedAt !== undefined,
        emailsSent: sentRows.length,
        lastSentAt: sentRows[0]?.createdAt ?? null,
        opened: engagement.opened,
        clicked: engagement.clicked,
        bounced: engagement.bounced,
        suppressed: (await liveSuppression(ctx, l.email)) !== null,
        track: enrollments.find((e) => e.status === "active")?.track ?? null,
        openReplies: await openRepliesFor(l.email),
      });
    }

    for (const p of prospects) {
      const name = [p.firstName, p.lastName].filter(Boolean).join(" ");
      people.push({
        kind: "prospect",
        id: p._id,
        email: p.email,
        name: name || null,
        company: p.company ?? null,
        origin: (p.campaignId && campaignNames.get(p.campaignId)) || "no campaign",
        stage: p.stage,
        createdAt: p.createdAt,
        consented: false,
        emailsSent: 0,
        lastSentAt: null,
        opened: false,
        clicked: false,
        bounced: false,
        suppressed: (await liveSuppression(ctx, p.email)) !== null,
        track: null,
        openReplies: await openRepliesFor(p.email),
      });
    }

    people.sort((a, b) => b.createdAt - a.createdAt);
    return {
      people,
      truncated: leads.length === MAX_PEOPLE || prospects.length === MAX_PEOPLE,
    };
  },
});

export interface TimelineItem {
  at: number;
  kind: "captured" | "send" | "callback" | "visit" | "reply" | "note" | "enrollment" | "suppression" | "assessment";
  title: string;
  detail?: string;
}

/** One person's full record: who they are and everything that has happened. */
export const getPerson = query({
  args: {
    kind: v.union(v.literal("lead"), v.literal("prospect")),
    id: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);

    const timeline: TimelineItem[] = [];
    let email: string;
    let header: {
      name: string | null;
      company: string | null;
      title: string | null;
      website: string | null;
      linkedinUrl: string | null;
      origin: string;
      stage: PipelineStage;
      createdAt: number;
      consentedAt: number | null;
      score: number | null;
    };
    let notes: Doc<"pipelineNotes">[];

    if (args.kind === "lead") {
      const leadId = ctx.db.normalizeId("leads", args.id);
      const lead = leadId ? await ctx.db.get(leadId) : null;
      if (!lead) return null;
      email = lead.email;
      header = {
        name: lead.name ?? null,
        company: null,
        title: null,
        website: null,
        linkedinUrl: null,
        origin: lead.source ?? "unknown",
        stage: lead.stage ?? "new",
        createdAt: lead.createdAt,
        consentedAt: lead.consentedAt ?? null,
        score: lead.score,
      };
      notes = await ctx.db
        .query("pipelineNotes")
        .withIndex("by_leadId", (q) => q.eq("leadId", lead._id))
        .take(200);
      timeline.push({
        at: lead.createdAt,
        kind: "captured",
        title: "Gave their email",
        detail: lead.source ? `via ${lead.source}` : undefined,
      });
      if (lead.sessionId) {
        const visits = await ctx.db
          .query("visitorEvents")
          .withIndex("by_sessionId", (q) => q.eq("sessionId", lead.sessionId))
          .take(200);
        for (const e of visits) {
          timeline.push({ at: e.timestamp, kind: "visit", title: e.name, detail: e.page });
        }
      }
    } else {
      const prospectId = ctx.db.normalizeId("outboundProspects", args.id);
      const prospect = prospectId ? await ctx.db.get(prospectId) : null;
      if (!prospect) return null;
      email = prospect.email;
      const campaign = prospect.campaignId ? await ctx.db.get(prospect.campaignId) : null;
      header = {
        name: [prospect.firstName, prospect.lastName].filter(Boolean).join(" ") || null,
        company: prospect.company ?? null,
        title: prospect.title ?? null,
        website: prospect.website ?? null,
        linkedinUrl: prospect.linkedinUrl ?? null,
        origin: campaign?.name ?? "no campaign",
        stage: prospect.stage,
        createdAt: prospect.createdAt,
        consentedAt: null,
        score: null,
      };
      notes = await ctx.db
        .query("pipelineNotes")
        .withIndex("by_prospectId", (q) => q.eq("prospectId", prospect._id))
        .take(200);
      timeline.push({
        at: prospect.createdAt,
        kind: "captured",
        title: "Added as a prospect",
        detail: `via ${prospect.source}`,
      });
    }

    for (const s of await ctx.db
      .query("emailSends")
      .withIndex("by_to", (q) => q.eq("to", email))
      .take(100)) {
      timeline.push({
        at: s.createdAt,
        kind: "send",
        title: s.status === "sent" ? `Sent: ${s.subject}` : `Send failed: ${s.subject}`,
        detail: s.status === "sent" ? s.template : s.error,
      });
    }
    for (const e of await ctx.db
      .query("emailEvents")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(200)) {
      timeline.push({
        at: e.occurredAt,
        kind: "callback",
        title: e.type.replace(/^email\./, "Email "),
        detail: e.link,
      });
    }
    for (const a of await ctx.db
      .query("assessments")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(20)) {
      timeline.push({
        at: a._creationTime,
        kind: "assessment",
        title: "Discovery assessment",
        detail: a.status,
      });
    }
    const enrollments = await ctx.db
      .query("sequenceEnrollments")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(20);
    for (const e of enrollments) {
      timeline.push({
        at: e.enrolledAt,
        kind: "enrollment",
        title: `Enrolled in ${TRACKS[e.track].label}`,
        detail: e.status === "exited" ? `exited: ${e.exitReason ?? "unknown"}` : e.status,
      });
    }
    const suppressions = await ctx.db
      .query("emailSuppressions")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(20);
    for (const s of suppressions) {
      timeline.push({
        at: s.createdAt,
        kind: "suppression",
        title: `Suppressed (${s.reason})`,
        detail: s.revokedAt !== undefined ? "since lifted" : `scope: ${s.scope}`,
      });
    }
    const replies = await ctx.db
      .query("outboundReplies")
      .withIndex("by_email", (q) => q.eq("email", email))
      .take(100);
    for (const r of replies) {
      timeline.push({
        at: r.receivedAt,
        kind: "reply",
        title: `Reply: ${r.category.replace(/_/g, " ")}`,
        detail: r.text,
      });
    }
    for (const note of notes) {
      timeline.push({ at: note.createdAt, kind: "note", title: "Note", detail: note.text });
    }

    timeline.sort((a, b) => b.at - a.at);
    return {
      kind: args.kind,
      id: args.id,
      email,
      ...header,
      suppressed: suppressions.some((s) => s.revokedAt === undefined),
      enrollments: enrollments.map((e) => ({
        id: e._id,
        track: e.track,
        label: TRACKS[e.track].label,
        status: e.status,
        lastStepSent: e.lastStepSent,
        nextDueAt: e.nextDueAt,
      })),
      openReplies: replies
        .filter((r) => r.handledAt === undefined)
        .map((r) => ({ id: r._id, category: r.category, receivedAt: r.receivedAt })),
      timeline,
    };
  },
});

/** Move a lead or a prospect to a pipeline stage. */
export const setStage = mutation({
  args: {
    kind: v.union(v.literal("lead"), v.literal("prospect")),
    id: v.string(),
    stage: pipelineStage,
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const now = Date.now();
    if (args.kind === "lead") {
      const id = ctx.db.normalizeId("leads", args.id);
      if (!id || !(await ctx.db.get(id))) throw new ConvexError("Lead not found");
      await ctx.db.patch(id, { stage: args.stage, stageUpdatedAt: now });
    } else {
      const id = ctx.db.normalizeId("outboundProspects", args.id);
      if (!id || !(await ctx.db.get(id))) throw new ConvexError("Prospect not found");
      await ctx.db.patch(id, { stage: args.stage, stageUpdatedAt: now });
    }
    return null;
  },
});

export const addNote = mutation({
  args: {
    kind: v.union(v.literal("lead"), v.literal("prospect")),
    id: v.string(),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const text = args.text.trim();
    if (!text) throw new ConvexError("A note needs some text");
    if (text.length > 4000) throw new ConvexError("Note is too long (4000 characters max)");
    const createdAt = Date.now();
    if (args.kind === "lead") {
      const leadId = ctx.db.normalizeId("leads", args.id);
      if (!leadId || !(await ctx.db.get(leadId))) throw new ConvexError("Lead not found");
      return await ctx.db.insert("pipelineNotes", { leadId, text, createdAt });
    }
    const prospectId = ctx.db.normalizeId("outboundProspects", args.id);
    if (!prospectId || !(await ctx.db.get(prospectId))) throw new ConvexError("Prospect not found");
    return await ctx.db.insert("pipelineNotes", { prospectId, text, createdAt });
  },
});

/**
 * File a reply against whoever sent it. A reply moves the person forward on
 * its own — nobody should have to log the reply and then also drag the stage —
 * and an unsubscribe request suppresses the address in the same transaction,
 * so it cannot be logged and then forgotten.
 */
export const logReply = mutation({
  args: {
    email: v.string(),
    category: replyCategory,
    text: v.optional(v.string()),
    receivedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const email = validateEmail(args.email);
    const now = Date.now();

    const lead = await ctx.db
      .query("leads")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    const prospect = await ctx.db
      .query("outboundProspects")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!lead && !prospect) {
      throw new ConvexError("No lead or prospect has that address. Add them first.");
    }

    // Nothing is owed back to an auto-reply, a bounce, an opt-out or a plain no.
    const needsAnswer = NEEDS_ANSWER_CATEGORIES.has(args.category);
    const replyId = await ctx.db.insert("outboundReplies", {
      email,
      leadId: lead?._id,
      prospectId: prospect?._id,
      campaignId: prospect?.campaignId,
      category: args.category,
      text: args.text?.trim() || undefined,
      receivedAt: args.receivedAt ?? now,
      handledAt: needsAnswer ? undefined : now,
      createdAt: now,
    });

    const nextStage: PipelineStage | null = POSITIVE_REPLY_CATEGORIES.has(args.category)
      ? "interested"
      : args.category === "negative_notfit" ||
          args.category === "negative_hostile" ||
          args.category === "unsubscribe"
        ? "lost"
        : args.category === "neutral_question" || args.category === "negative_notnow"
          ? "replied"
          : null;
    // Never walk someone backwards: a booked or won person who sends a
    // question stays booked or won.
    const settled: PipelineStage[] = ["booked", "won"];
    if (nextStage) {
      if (lead && !settled.includes(lead.stage ?? "new")) {
        await ctx.db.patch(lead._id, { stage: nextStage, stageUpdatedAt: now });
      }
      if (prospect && !settled.includes(prospect.stage)) {
        await ctx.db.patch(prospect._id, { stage: nextStage, stageUpdatedAt: now });
      }
    }

    // A hostile reply is treated as an opt-out: remove them from everything.
    if (
      args.category === "unsubscribe" ||
      args.category === "negative_hostile" ||
      args.category === "bounce"
    ) {
      await ctx.runMutation(internal.emailSuppressions.suppress, {
        email,
        reason: args.category === "bounce" ? ("hard_bounce" as const) : ("unsubscribe" as const),
        scope: args.category === "bounce" ? ("all" as const) : ("marketing" as const),
        source: "admin:reply-log",
      });
    }
    return replyId;
  },
});

export const setReplyHandled = mutation({
  args: { replyId: v.id("outboundReplies"), handled: v.boolean() },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    if (!(await ctx.db.get(args.replyId))) throw new ConvexError("Reply not found");
    await ctx.db.patch(args.replyId, { handledAt: args.handled ? Date.now() : undefined });
    return null;
  },
});

/** Replies, newest first, with who they are from. */
export const listReplies = query({
  args: { onlyOpen: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const rows = await ctx.db
      .query("outboundReplies")
      .withIndex("by_createdAt")
      .order("desc")
      .take(300);
    return rows
      .filter((r) => !args.onlyOpen || r.handledAt === undefined)
      .map((r) => ({
        id: r._id,
        email: r.email,
        kind: r.leadId ? ("lead" as const) : ("prospect" as const),
        personId: (r.leadId ?? r.prospectId ?? null) as string | null,
        category: r.category,
        text: r.text ?? null,
        receivedAt: r.receivedAt,
        handledAt: r.handledAt ?? null,
      }));
  },
});

/** Stop all email to an address by hand, or lift a suppression. */
export const setSuppressed = mutation({
  args: { email: v.string(), suppressed: v.boolean() },
  handler: async (ctx, args): Promise<null> => {
    await requireOwner(ctx);
    const email = validateEmail(args.email);
    if (args.suppressed) {
      await ctx.runMutation(internal.emailSuppressions.suppress, {
        email,
        reason: "manual" as const,
        scope: "all" as const,
        source: "admin",
      });
    } else {
      await ctx.runMutation(internal.emailSuppressions.revoke, { email });
    }
    return null;
  },
});

/** The suppression list, newest first. */
export const listSuppressions = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const rows = await ctx.db
      .query("emailSuppressions")
      .withIndex("by_createdAt")
      .order("desc")
      .take(300);
    return rows.map((r) => ({
      id: r._id,
      email: r.email,
      reason: r.reason,
      scope: r.scope,
      source: r.source ?? null,
      createdAt: r.createdAt,
      live: r.revokedAt === undefined,
    }));
  },
});

/** Sequence tracks, their steps, and who is enrolled. */
export const sequences = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const enrollments = await ctx.db.query("sequenceEnrollments").order("desc").take(300);
    return {
      paused: await sequencesPaused(ctx),
      tracks: Object.values(TRACKS).map((t) => ({
        key: t.key,
        label: t.label,
        steps: t.steps.map((s) => ({
          key: s.key,
          role: s.role,
          subject: s.subject,
          authored: isStepAuthored(s),
          delayDays: Math.round(s.delayMs / DAY_MS),
        })),
        active: enrollments.filter((e) => e.track === t.key && e.status === "active").length,
        paused: enrollments.filter((e) => e.track === t.key && e.status === "paused").length,
        exited: enrollments.filter((e) => e.track === t.key && e.status === "exited").length,
      })),
      enrollments: enrollments.map((e) => ({
        id: e._id,
        email: e.email,
        track: e.track,
        status: e.status,
        lastStepSent: e.lastStepSent,
        nextDueAt: e.nextDueAt,
        exitReason: e.exitReason ?? null,
        enrolledAt: e.enrolledAt,
      })),
    };
  },
});

/**
 * The global switch for sequence sending. Paused is the default and the safe
 * state: the sweeper claims nothing while it is on.
 */
export const setSequencesPaused = mutation({
  args: { paused: v.boolean() },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("ownerSettings")
      .withIndex("by_key", (q) => q.eq("key", "owner"))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { sequencesPaused: args.paused, updatedAt: now });
    } else {
      await ctx.db.insert("ownerSettings", {
        key: "owner",
        // Same default objectives.ts uses when the row does not exist yet.
        overheadWeeklyBudgetHours: 10,
        sequencesPaused: args.paused,
        updatedAt: now,
      });
    }
    return null;
  },
});

/** Pause, resume or end one person's enrollment. */
export const setEnrollmentStatus = mutation({
  args: {
    enrollmentId: v.id("sequenceEnrollments"),
    status: v.union(v.literal("active"), v.literal("paused"), v.literal("exited")),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const e = await ctx.db.get(args.enrollmentId);
    if (!e) throw new ConvexError("Enrollment not found");
    if (e.status === "exited") throw new ConvexError("That enrollment has already ended");
    const now = Date.now();
    await ctx.db.patch(e._id, {
      status: args.status,
      updatedAt: now,
      ...(args.status === "exited" ? { exitReason: "admin", exitedAt: now } : {}),
    });
    return null;
  },
});
