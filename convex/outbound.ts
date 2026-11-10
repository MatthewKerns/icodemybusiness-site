/**
 * Cold outbound: campaigns, the prospects they are aimed at, and the inboxes
 * that send them.
 *
 * Sender-agnostic (Matthew, 2026-11-09). Nothing here sends email. Instantly is
 * the planned sender, so a campaign carries `externalId` for a later analytics
 * sync; until then sent/bounced totals are copied in from the sending tool by
 * hand and everything else — who replied, who booked — is tracked here.
 */

import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireOwner } from "./lib/auth";
import { validateEmail } from "./lib/validators";
import { findSuppression } from "./lib/suppression";
import {
  BACKUP_INBOX_MAX,
  BACKUP_INBOX_MIN,
  NON_REPLY_CATEGORIES,
  POSITIVE_REPLY_CATEGORIES,
  PIPELINE_STAGES,
  inboxStatus,
  isBackupInbox,
} from "./lib/pipeline";

const MAX_STEPS = 8;
const MAX_IMPORT = 500;
const MAX_ROWS = 5_000;

const campaignStatus = v.union(
  v.literal("draft"),
  v.literal("live"),
  v.literal("paused"),
  v.literal("done")
);

const stepValidator = v.object({
  subject: v.string(),
  body: v.string(),
  delayDays: v.number(),
});

function cleanText(value: string | undefined, max: number): string | undefined {
  const t = value?.trim();
  return t ? t.slice(0, max) : undefined;
}

function count(value: number | undefined, label: string): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < 0) throw new ConvexError(`${label} must be zero or more`);
  return Math.floor(value);
}

/** Campaigns, newest first, each with the numbers that say how it is doing. */
export const listCampaigns = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const campaigns = await ctx.db.query("outboundCampaigns").order("desc").take(200);
    const out = [];
    for (const c of campaigns) {
      const prospects = await ctx.db
        .query("outboundProspects")
        .withIndex("by_campaignId", (q) => q.eq("campaignId", c._id))
        .take(MAX_ROWS);
      const byStage = Object.fromEntries(PIPELINE_STAGES.map((s) => [s, 0])) as Record<
        (typeof PIPELINE_STAGES)[number],
        number
      >;
      for (const p of prospects) byStage[p.stage]++;
      const replies = await ctx.db
        .query("outboundReplies")
        .withIndex("by_campaignId", (q) => q.eq("campaignId", c._id))
        .take(MAX_ROWS);
      // A person, not a message: three replies from one prospect is one reply.
      const repliers = new Set<string>();
      const positive = new Set<string>();
      let hostile = 0;
      let unsubscribed = 0;
      for (const r of replies) {
        if (r.category === "negative_hostile") hostile++;
        if (r.category === "unsubscribe") unsubscribed++;
        if (NON_REPLY_CATEGORIES.has(r.category)) continue;
        repliers.add(r.email);
        if (POSITIVE_REPLY_CATEGORIES.has(r.category)) positive.add(r.email);
      }
      out.push({
        id: c._id,
        name: c.name,
        status: c.status,
        sender: c.sender,
        externalId: c.externalId ?? null,
        audience: c.audience ?? null,
        offer: c.offer ?? null,
        steps: c.steps,
        reportedSent: c.reportedSent ?? null,
        reportedBounced: c.reportedBounced ?? null,
        reportedAt: c.reportedAt ?? null,
        launchedAt: c.launchedAt ?? null,
        createdAt: c.createdAt,
        prospects: prospects.length,
        byStage,
        replied: repliers.size,
        positive: positive.size,
        hostile,
        unsubscribed,
        booked: byStage.booked + byStage.won,
      });
    }
    return out;
  },
});

/** Create a campaign, or save changes to one. */
export const saveCampaign = mutation({
  args: {
    campaignId: v.optional(v.id("outboundCampaigns")),
    name: v.string(),
    sender: v.optional(v.string()),
    externalId: v.optional(v.string()),
    audience: v.optional(v.string()),
    offer: v.optional(v.string()),
    steps: v.array(stepValidator),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const name = args.name.trim();
    if (!name) throw new ConvexError("A campaign needs a name");
    if (args.steps.length > MAX_STEPS) {
      throw new ConvexError(`A campaign can have at most ${MAX_STEPS} steps`);
    }
    const steps = args.steps.map((s) => ({
      subject: s.subject.trim().slice(0, 300),
      body: s.body.slice(0, 10_000),
      delayDays: Math.max(0, Math.min(60, Math.floor(s.delayDays))),
    }));
    const now = Date.now();
    const fields = {
      name: name.slice(0, 200),
      sender: cleanText(args.sender, 40) ?? "instantly",
      externalId: cleanText(args.externalId, 200),
      audience: cleanText(args.audience, 2000),
      offer: cleanText(args.offer, 2000),
      steps,
      updatedAt: now,
    };
    if (args.campaignId) {
      if (!(await ctx.db.get(args.campaignId))) throw new ConvexError("Campaign not found");
      await ctx.db.patch(args.campaignId, fields);
      return args.campaignId;
    }
    return await ctx.db.insert("outboundCampaigns", {
      ...fields,
      status: "draft",
      createdAt: now,
    });
  },
});

export const setCampaignStatus = mutation({
  args: { campaignId: v.id("outboundCampaigns"), status: campaignStatus },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const c = await ctx.db.get(args.campaignId);
    if (!c) throw new ConvexError("Campaign not found");
    const now = Date.now();
    await ctx.db.patch(c._id, {
      status: args.status,
      updatedAt: now,
      // First time it goes live is the launch date; a later resume keeps it.
      ...(args.status === "live" && c.launchedAt === undefined ? { launchedAt: now } : {}),
    });
    return null;
  },
});

/** Copy the sent and bounced totals in from the sending tool. */
export const reportCampaignTotals = mutation({
  args: {
    campaignId: v.id("outboundCampaigns"),
    sent: v.number(),
    bounced: v.number(),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    if (!(await ctx.db.get(args.campaignId))) throw new ConvexError("Campaign not found");
    const sent = count(args.sent, "Sent")!;
    const bounced = count(args.bounced, "Bounced")!;
    if (bounced > sent) throw new ConvexError("Bounced cannot be more than sent");
    const now = Date.now();
    await ctx.db.patch(args.campaignId, {
      reportedSent: sent,
      reportedBounced: bounced,
      reportedAt: now,
      updatedAt: now,
    });
    return null;
  },
});

const prospectInput = v.object({
  email: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  company: v.optional(v.string()),
  title: v.optional(v.string()),
  website: v.optional(v.string()),
  linkedinUrl: v.optional(v.string()),
});

/**
 * Add prospects, one or a pasted list. Skips — and counts — anything that
 * should not be mailed: a malformed address, a duplicate, an address already
 * on the suppression list, and anyone who is already a site lead (they came to
 * us; they do not get a cold email).
 */
export const importProspects = mutation({
  args: {
    campaignId: v.optional(v.id("outboundCampaigns")),
    source: v.string(),
    prospects: v.array(prospectInput),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    if (args.prospects.length > MAX_IMPORT) {
      throw new ConvexError(`Import at most ${MAX_IMPORT} prospects at a time`);
    }
    if (args.campaignId && !(await ctx.db.get(args.campaignId))) {
      throw new ConvexError("Campaign not found");
    }
    const now = Date.now();
    const seen = new Set<string>();
    const result = { added: 0, invalid: 0, duplicate: 0, suppressed: 0, alreadyLead: 0 };

    for (const p of args.prospects) {
      let email: string;
      try {
        email = validateEmail(p.email);
      } catch {
        result.invalid++;
        continue;
      }
      if (seen.has(email)) {
        result.duplicate++;
        continue;
      }
      seen.add(email);
      const existing = await ctx.db
        .query("outboundProspects")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (existing) {
        result.duplicate++;
        continue;
      }
      if (await findSuppression(ctx, email, "marketing")) {
        result.suppressed++;
        continue;
      }
      const lead = await ctx.db
        .query("leads")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();
      if (lead) {
        result.alreadyLead++;
        continue;
      }
      await ctx.db.insert("outboundProspects", {
        campaignId: args.campaignId,
        email,
        firstName: cleanText(p.firstName, 100),
        lastName: cleanText(p.lastName, 100),
        company: cleanText(p.company, 200),
        title: cleanText(p.title, 200),
        website: cleanText(p.website, 300),
        linkedinUrl: cleanText(p.linkedinUrl, 300),
        source: cleanText(args.source, 40) ?? "manual",
        stage: "new",
        stageUpdatedAt: now,
        createdAt: now,
      });
      result.added++;
    }
    return result;
  },
});

/** Sending inboxes and whether enough backups are warming. */
export const listInboxes = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const rows = await ctx.db.query("sendingInboxes").order("desc").take(500);
    const backups = rows.filter((r) => isBackupInbox(r.status)).length;
    return {
      inboxes: rows.map((r) => ({
        id: r._id,
        email: r.email,
        provider: r.provider ?? null,
        status: r.status,
        warmupStartedAt: r.warmupStartedAt ?? null,
        dailyLimit: r.dailyLimit ?? null,
        notes: r.notes ?? null,
        updatedAt: r.updatedAt,
      })),
      backups,
      backupMin: BACKUP_INBOX_MIN,
      backupMax: BACKUP_INBOX_MAX,
    };
  },
});

/** Add an inbox, or save changes to one. */
export const saveInbox = mutation({
  args: {
    inboxId: v.optional(v.id("sendingInboxes")),
    email: v.string(),
    provider: v.optional(v.string()),
    status: inboxStatus,
    warmupStartedAt: v.optional(v.number()),
    dailyLimit: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const email = validateEmail(args.email);
    const now = Date.now();
    const sameAddress = await ctx.db
      .query("sendingInboxes")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (sameAddress && sameAddress._id !== args.inboxId) {
      throw new ConvexError("That inbox is already on the list");
    }
    const fields = {
      email,
      provider: cleanText(args.provider, 40),
      status: args.status,
      // Starting a warm-up without a date means it started now.
      warmupStartedAt:
        args.warmupStartedAt ?? (args.status === "warming" ? now : undefined),
      dailyLimit: count(args.dailyLimit, "Daily limit"),
      notes: cleanText(args.notes, 2000),
      updatedAt: now,
    };
    if (args.inboxId) {
      const existing = await ctx.db.get(args.inboxId);
      if (!existing) throw new ConvexError("Inbox not found");
      await ctx.db.patch(args.inboxId, {
        ...fields,
        warmupStartedAt: fields.warmupStartedAt ?? existing.warmupStartedAt,
      });
      return args.inboxId;
    }
    return await ctx.db.insert("sendingInboxes", { ...fields, createdAt: now });
  },
});
