import { v, ConvexError } from "convex/values";
import {
  query,
  action,
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireOwner } from "./lib/auth";
import { getMangoClient } from "./lib/mangoClient";

/**
 * Read-only Mango sync.
 *
 * Mango stays the system of record for time; this only caches the latest answer
 * per kind so the dashboard renders instantly and keeps working when Mango is
 * unreachable. There is no local history table — that would be an unbounded
 * second copy to reconcile.
 */

export const SNAPSHOT_KINDS = {
  timeThisWeek: "time_summary_this_week",
  timeLastWeek: "time_summary_last_week",
  focusProjects: "focus_projects",
  overheadHours: "overhead_hours_7d",
  dailyTodo: "daily_todo",
} as const;

/** Beyond this a snapshot is shown as stale rather than current. */
export const SNAPSHOT_STALE_MS = 6 * 60 * 60 * 1000;
const SYNC_COOLDOWN_MS = 60 * 1000;

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/** Monday-start week bounds as YYYY-MM-DD, matching Mango's start/end args. */
export function weekBounds(now: number, weeksAgo: number): { start: string; end: string } {
  const date = new Date(now);
  const day = date.getUTCDay() || 7; // Sunday(0) -> 7
  const monday = new Date(date);
  monday.setUTCDate(date.getUTCDate() - day + 1 - weeksAgo * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(monday), end: iso(sunday) };
}

// --- Queries ----------------------------------------------------------------

export const getSnapshots = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const rows = await ctx.db.query("mangoSnapshots").withIndex("by_kind").take(50);

    const byKind: Record<string, (typeof rows)[number]> = {};
    for (const row of rows) byKind[row.kind] = row;

    const okAt = rows
      .filter((row) => row.okAt !== undefined)
      .map((row) => row.okAt ?? 0);
    const lastOkAt = okAt.length > 0 ? Math.max(...okAt) : null;

    return {
      byKind,
      lastOkAt,
      // "Configured" is derived from ever having synced; the token itself never
      // leaves the Convex deployment.
      configured: rows.length > 0,
      stale: lastOkAt === null || Date.now() - lastOkAt > SNAPSHOT_STALE_MS,
      lastError: rows.find((row) => !row.ok)?.error,
    };
  },
});

export const getWriteLog = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    return await ctx.db
      .query("mangoWrites")
      .withIndex("by_createdAt")
      .order("desc")
      .take(Math.min(Math.max(args.limit ?? 10, 1), 50));
  },
});

// --- Internal plumbing ------------------------------------------------------

export const upsertSnapshot = internalMutation({
  args: {
    kind: v.string(),
    payload: v.optional(v.any()),
    ok: v.boolean(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db
      .query("mangoSnapshots")
      .withIndex("by_kind", (q) => q.eq("kind", args.kind))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        // Keep the last good payload on failure — a stale number beats a blank
        // panel, as long as the UI says it is stale.
        payload: args.ok ? args.payload : existing.payload,
        ok: args.ok,
        error: args.ok ? undefined : args.error,
        fetchedAt: now,
        okAt: args.ok ? now : existing.okAt,
      });
      return existing._id;
    }

    return await ctx.db.insert("mangoSnapshots", {
      kind: args.kind,
      payload: args.payload,
      ok: args.ok,
      error: args.ok ? undefined : args.error,
      fetchedAt: now,
      okAt: args.ok ? now : undefined,
    });
  },
});

export const recordWrite = internalMutation({
  args: {
    tool: v.string(),
    args: v.any(),
    ok: v.boolean(),
    response: v.optional(v.any()),
    error: v.optional(v.string()),
    objectiveId: v.optional(v.id("objectives")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("mangoWrites", { ...args, createdAt: Date.now() });
  },
});

export const internalGetOverheadKey = internalQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query("ownerSettings")
      .withIndex("by_key", (q) => q.eq("key", "owner"))
      .first();
    return settings?.mangoOverheadKey ?? process.env.MANGO_OVERHEAD_KEY ?? null;
  },
});

// --- Sync -------------------------------------------------------------------

/**
 * Pull the read-only snapshots the dashboard needs.
 *
 * Each tool is wrapped separately so one failing call degrades one tile rather
 * than blanking the panel, and a failure is recorded rather than thrown — this
 * runs on a cron with nobody watching.
 */
export const syncSnapshot = internalAction({
  args: {},
  handler: async (ctx) => {
    const mango = getMangoClient();
    if (!mango) {
      console.log("Mango is not configured (MANGO_MCP_TOKEN unset) — skipping sync");
      return { skipped: true };
    }

    const now = Date.now();
    const thisWeek = weekBounds(now, 0);
    const lastWeek = weekBounds(now, 1);
    const overheadKey = await ctx.runQuery(internal.mango.internalGetOverheadKey, {});

    const jobs: Array<{ kind: string; tool: string; args: Record<string, unknown> }> = [
      {
        kind: SNAPSHOT_KINDS.timeThisWeek,
        tool: "get_time_summary",
        args: { start: thisWeek.start, end: thisWeek.end },
      },
      {
        kind: SNAPSHOT_KINDS.timeLastWeek,
        tool: "get_time_summary",
        args: { start: lastWeek.start, end: lastWeek.end },
      },
      { kind: SNAPSHOT_KINDS.focusProjects, tool: "get_focus_projects", args: {} },
      { kind: SNAPSHOT_KINDS.dailyTodo, tool: "get_daily_todo", args: {} },
    ];

    // Only meaningful once the overhead engagement's slug is known.
    if (overheadKey) {
      jobs.push({
        kind: SNAPSHOT_KINDS.overheadHours,
        tool: "get_objective_hours",
        args: { client_slug: overheadKey, days: 7 },
      });
    }

    let failures = 0;
    for (const job of jobs) {
      try {
        const payload = await mango.callTool(job.tool, job.args);
        await ctx.runMutation(internal.mango.upsertSnapshot, {
          kind: job.kind,
          payload,
          ok: true,
        });
      } catch (error) {
        failures += 1;
        console.error(`Mango ${job.tool} failed:`, error);
        await ctx.runMutation(internal.mango.upsertSnapshot, {
          kind: job.kind,
          ok: false,
          error: errorText(error),
        });
      }
    }

    return { skipped: false, total: jobs.length, failures };
  },
});

export const syncNow = action({
  args: {},
  handler: async (ctx): Promise<{ skipped: boolean; total?: number; failures?: number }> => {
    await requireOwner(ctx);
    const snapshots = await ctx.runQuery(internal.mango.internalLastAttempt, {});
    if (snapshots !== null && Date.now() - snapshots < SYNC_COOLDOWN_MS) {
      throw new ConvexError("Just synced — try again in a minute");
    }
    return await ctx.runAction(internal.mango.syncSnapshot, {});
  },
});

export const internalLastAttempt = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("mangoSnapshots").withIndex("by_kind").take(50);
    if (rows.length === 0) return null;
    return Math.max(...rows.map((row) => row.fetchedAt));
  },
});

/**
 * The only write back to Mango, and it is confirm-first.
 *
 * Deliberately narrow. `set_today_pins` takes engagement slugs, not to-dos, so
 * this dashboard's per-to-do today list has no faithful representation in Mango
 * and is never synced outward. `set_focus_target` changes hour commitments,
 * which is a business decision rather than a dashboard side effect. That leaves
 * marking a linked objective done, which maps cleanly.
 *
 * Never part of applyOps: a Convex mutation cannot do network I/O, and a local
 * reorganization must not silently mutate an external system.
 */
export const pushObjectiveStatus = action({
  args: {
    objectiveId: v.id("objectives"),
    mangoKey: v.string(),
    mangoObjectiveId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args): Promise<{ ok: boolean; error?: string }> => {
    await requireOwner(ctx);

    const mango = getMangoClient();
    if (!mango) throw new ConvexError("Mango is not configured on this deployment");

    const toolArgs = {
      key: args.mangoKey,
      objective_id: args.mangoObjectiveId,
      status: args.status,
    };

    try {
      const response = await mango.callTool("set_focus_objective", toolArgs);
      await ctx.runMutation(internal.mango.recordWrite, {
        tool: "set_focus_objective",
        args: toolArgs,
        ok: true,
        response,
        objectiveId: args.objectiveId,
      });
      await ctx.runAction(internal.mango.syncSnapshot, {});
      return { ok: true };
    } catch (error) {
      const message = errorText(error);
      await ctx.runMutation(internal.mango.recordWrite, {
        tool: "set_focus_objective",
        args: toolArgs,
        ok: false,
        error: message,
        objectiveId: args.objectiveId,
      });
      return { ok: false, error: message };
    }
  },
});

// --- ICMB lead flow: push to Mango ------------------------------------------
//
// Mango is the lead system of record (it dedupes by email and owns the ClickUp
// "50 Leads" view); the site only pushes. Both pushes are fire-and-forget from
// the visitor's point of view: a failure is logged and recorded in
// `mangoWrites`, never thrown back into a form submit.

/**
 * Call at every place a `leads` row is NEWLY inserted (never on the dedupe /
 * re-link path) so Mango hears about each lead exactly once.
 */
export async function scheduleLeadPush(ctx: MutationCtx, leadId: Id<"leads">) {
  await ctx.scheduler.runAfter(0, internal.mango.pushLead, { leadId });
}

export const internalLeadForPush = internalQuery({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadId);
    if (!lead) return null;
    return {
      email: lead.email,
      name: lead.name,
      source: lead.source,
      variant: lead.variant,
      createdAt: lead.createdAt,
    };
  },
});

export const pushLead = internalAction({
  args: { leadId: v.id("leads") },
  handler: async (ctx, args): Promise<{ skipped: boolean; ok?: boolean }> => {
    const mango = getMangoClient();
    if (!mango) {
      console.log("Mango is not configured (MANGO_MCP_TOKEN unset) — skipping lead push");
      return { skipped: true };
    }

    const lead = await ctx.runQuery(internal.mango.internalLeadForPush, {
      leadId: args.leadId,
    });
    if (!lead) {
      console.warn(`Lead ${args.leadId} no longer exists — skipping lead push`);
      return { skipped: true };
    }

    // Which site path produced the lead, as a readable line for the ClickUp task.
    const summary = [
      lead.source ? `source: ${lead.source}` : null,
      lead.variant ? `variant: ${lead.variant}` : null,
    ]
      .filter((part): part is string => part !== null)
      .join(" · ");

    const toolArgs: Record<string, unknown> = {
      email: lead.email,
      source: "site",
      external_id: args.leadId,
      created_at: new Date(lead.createdAt).toISOString(),
    };
    if (lead.name) toolArgs.name = lead.name;
    if (summary) toolArgs.summary = summary;

    // The audit row names the lead by id only, so the email is not copied into
    // a second table.
    const logged = { external_id: args.leadId, source: "site" };
    try {
      const response = await mango.callTool("icmb_lead_ingest", toolArgs);
      await ctx.runMutation(internal.mango.recordWrite, {
        tool: "icmb_lead_ingest",
        args: logged,
        ok: true,
        response,
      });
      return { skipped: false, ok: true };
    } catch (error) {
      console.error(`Mango icmb_lead_ingest failed for lead ${args.leadId}:`, error);
      await ctx.runMutation(internal.mango.recordWrite, {
        tool: "icmb_lead_ingest",
        args: logged,
        ok: false,
        error: errorText(error),
      });
      return { skipped: false, ok: false };
    }
  },
});

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Nth (1-based) Sunday of a UTC month, as a day-of-month. */
function nthSunday(year: number, month: number, n: number): number {
  const firstDow = new Date(Date.UTC(year, month, 1)).getUTCDay();
  return 1 + ((7 - firstDow) % 7) + (n - 1) * 7;
}

/**
 * America/Los_Angeles offset from UTC in hours (-7 PDT / -8 PST) at an instant.
 * US rule since 2007: PDT from the 2nd Sunday of March 02:00 PST (10:00 UTC) to
 * the 1st Sunday of November 02:00 PDT (09:00 UTC). Hand-rolled so it does not
 * depend on the Convex runtime's Intl time-zone data.
 */
export function pacificOffsetHours(utcMs: number): number {
  const year = new Date(utcMs).getUTCFullYear();
  const dstStart = Date.UTC(year, 2, nthSunday(year, 2, 2), 10);
  const dstEnd = Date.UTC(year, 10, nthSunday(year, 10, 1), 9);
  return utcMs >= dstStart && utcMs < dstEnd ? -7 : -8;
}

/** 00:00 Pacific on a calendar date, as epoch ms. Midnight is never inside a DST switch. */
function pacificMidnight(year: number, month: number, day: number): number {
  const ifPdt = Date.UTC(year, month, day, 7);
  return pacificOffsetHours(ifPdt) === -7 ? ifPdt : Date.UTC(year, month, day, 8);
}

/**
 * The last COMPLETE Saturday-to-Friday week in America/Los_Angeles at `nowMs`:
 * `weekStart` is that Saturday (YYYY-MM-DD), `[startMs, endMs)` runs Saturday
 * 00:00 PT to the next Saturday 00:00 PT (167 h or 169 h across a DST switch).
 * Run on Saturday morning PT, that is the week that ended last night.
 */
export function saturdayWeekStart(nowMs: number): {
  weekStart: string;
  startMs: number;
  endMs: number;
} {
  const local = new Date(nowMs + pacificOffsetHours(nowMs) * HOUR_MS);
  const daysSinceSaturday = (local.getUTCDay() + 1) % 7; // Sat 0, Sun 1, ... Fri 6
  const start = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
      (daysSinceSaturday + 7) * DAY_MS,
  );
  const end = new Date(start.getTime() + 7 * DAY_MS);
  return {
    weekStart: start.toISOString().slice(0, 10),
    startMs: pacificMidnight(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
    endMs: pacificMidnight(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  };
}

/** Bounded like funnelConstraint's scan; a hit on the cap is reported, not hidden. */
const MAX_LEAD_ROWS = 10000;

/**
 * Leads with `createdAt` in `[startMs, endMs)`. `leads` has no createdAt index,
 * so this rides the built-in `by_creation_time` index (createdAt is set in the
 * inserting mutation, so it tracks `_creationTime`) with an hour of slack each
 * side, then filters on createdAt exactly.
 */
export const internalCountLeadsCreated = internalQuery({
  args: { startMs: v.number(), endMs: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("leads")
      .withIndex("by_creation_time", (q) =>
        q.gte("_creationTime", args.startMs - HOUR_MS).lt("_creationTime", args.endMs + HOUR_MS),
      )
      .take(MAX_LEAD_ROWS);
    const count = rows.filter(
      (lead) => lead.createdAt >= args.startMs && lead.createdAt < args.endMs,
    ).length;
    return { count, truncated: rows.length === MAX_LEAD_ROWS };
  },
});

/**
 * Weekly push for the Saturday lead review: new site leads in the week that
 * just ended plus the funnel constraint. Runs from a cron; failures are logged
 * and recorded rather than thrown — nobody is watching a cron.
 *
 * The funnel is `internalFunnelConstraint` over the trailing 7 days at run time
 * (per the Mango tool contract), so it is offset from the Sat–Fri lead window
 * by the cron's hours past Saturday 00:00 PT.
 */
export const pushFunnelWeek = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ skipped: boolean; ok?: boolean; weekStart?: string; truncated?: boolean }> => {
    const mango = getMangoClient();
    if (!mango) {
      console.log("Mango is not configured (MANGO_MCP_TOKEN unset) — skipping funnel week push");
      return { skipped: true };
    }

    const week = saturdayWeekStart(Date.now());
    const leads = await ctx.runQuery(internal.mango.internalCountLeadsCreated, {
      startMs: week.startMs,
      endMs: week.endMs,
    });
    if (leads.truncated) {
      console.warn(`Lead count for week ${week.weekStart} hit the ${MAX_LEAD_ROWS}-row cap`);
    }
    const funnel = await ctx.runQuery(internal.funnelConstraint.internalFunnelConstraint, {
      windowDays: 7,
    });

    const toolArgs = {
      week_start: week.weekStart,
      window_days: 7,
      site_leads_new: leads.count,
      funnel,
    };
    try {
      const response = await mango.callTool("record_icmb_funnel_week", toolArgs);
      await ctx.runMutation(internal.mango.recordWrite, {
        tool: "record_icmb_funnel_week",
        args: toolArgs,
        ok: true,
        response,
      });
      return { skipped: false, ok: true, weekStart: week.weekStart, truncated: leads.truncated };
    } catch (error) {
      console.error("Mango record_icmb_funnel_week failed:", error);
      await ctx.runMutation(internal.mango.recordWrite, {
        tool: "record_icmb_funnel_week",
        args: toolArgs,
        ok: false,
        error: errorText(error),
      });
      return { skipped: false, ok: false, weekStart: week.weekStart, truncated: leads.truncated };
    }
  },
});
