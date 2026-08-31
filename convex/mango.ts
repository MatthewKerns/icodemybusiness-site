import { v, ConvexError } from "convex/values";
import {
  query,
  action,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
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
