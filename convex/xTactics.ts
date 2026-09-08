import { mutation, query, action, internalQuery, MutationCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { createGoogleDoc, driveEnvFromProcess } from "./lib/googleDrive";
import { documentHtml, worksheetHtml, worksheetTitle } from "./lib/worksheet";
import { v, ConvexError } from "convex/values";
import { requireOwner } from "./lib/auth";

export const PILLAR_PREFIX = {
  clockify: "CLK",
  paper: "PPR",
  writing: "WRT",
  claude: "CLD",
} as const;

export type Pillar = keyof typeof PILLAR_PREFIX;

const pillarValidator = v.union(
  v.literal("clockify"),
  v.literal("paper"),
  v.literal("writing"),
  v.literal("claude")
);

/** Next free tacticId for a pillar, e.g. "CLK-007". */
async function nextId(ctx: MutationCtx, pillar: Pillar): Promise<string> {
  const prefix = PILLAR_PREFIX[pillar];
  const rows = await ctx.db
    .query("xTactics")
    .withIndex("by_pillar", (q) => q.eq("pillar", pillar))
    .take(5000);
  let max = 0;
  for (const row of rows) {
    const n = parseInt(row.tacticId.slice(prefix.length + 1), 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

/**
 * Add a tactic to the bank. The tacticId is assigned server-side so the
 * admin form, the ingest skill, and the interview flow can't collide.
 * New rows always start `pending` — approval is a separate, deliberate act.
 */
export const add = mutation({
  args: {
    pillar: pillarValidator,
    text: v.string(),
    source: v.string(),
    tiesTo: v.optional(v.string()),
    sourceAssetIds: v.optional(v.array(v.id("xAssets"))),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const text = args.text.trim();
    if (!text) throw new ConvexError("Tactic text is required");

    // Near-duplicate guard: same pillar + same normalized text.
    const siblings = await ctx.db
      .query("xTactics")
      .withIndex("by_pillar", (q) => q.eq("pillar", args.pillar))
      .take(5000);
    const normalized = text.toLowerCase();
    const dupe = siblings.find((s) => s.text.trim().toLowerCase() === normalized);
    if (dupe) {
      throw new ConvexError(`Duplicate of ${dupe.tacticId}`);
    }

    if (args.tiesTo) {
      const tied = await ctx.db
        .query("xTactics")
        .withIndex("by_tacticId", (q) => q.eq("tacticId", args.tiesTo!))
        .unique();
      if (!tied) throw new ConvexError(`tiesTo tactic ${args.tiesTo} not found`);
    }

    const tacticId = await nextId(ctx, args.pillar);
    const id = await ctx.db.insert("xTactics", {
      tacticId,
      pillar: args.pillar,
      text,
      source: args.source,
      tiesTo: args.tiesTo,
      sourceAssetIds: args.sourceAssetIds,
      status: "pending",
      createdAt: Date.now(),
    });
    return { id, tacticId };
  },
});

export const approve = mutation({
  args: { id: v.id("xTactics") },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError("Tactic not found");
    if (row.status === "approved") return null;
    await ctx.db.patch(args.id, { status: "approved", approvedAt: Date.now() });
    return null;
  },
});

export const retire = mutation({
  args: { id: v.id("xTactics") },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError("Tactic not found");
    await ctx.db.patch(args.id, { status: "retired" });
    return null;
  },
});

/** Tactics for one pillar (all statuses), oldest first. */
export const listByPillar = query({
  args: { pillar: pillarValidator },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    return await ctx.db
      .query("xTactics")
      .withIndex("by_pillar", (q) => q.eq("pillar", args.pillar))
      .take(1000);
  },
});

/** All tactics with a given status (the review inbox is `pending`). */
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("retired")
    ),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    return await ctx.db
      .query("xTactics")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .take(1000);
  },
});

const GOOGLE_DOC_URL = /^https:\/\/docs\.google\.com\/document\/d\/[\w-]{10,}(\/.*)?$/;

/**
 * Attach (or clear) the Google Doc worksheet for a tactic. The admin "Open
 * worksheet" button and the skool-worksheet skill both go through here, so the
 * URL shape is checked once: only a docs.google.com document link is accepted.
 */
export const setWorksheet = mutation({
  args: { id: v.id("xTactics"), worksheetUrl: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError("Tactic not found");
    const url = args.worksheetUrl?.trim();
    if (!url) {
      await ctx.db.patch(args.id, { worksheetUrl: undefined });
      return null;
    }
    if (!GOOGLE_DOC_URL.test(url)) {
      throw new ConvexError("Worksheet must be a Google Doc link (docs.google.com/document/d/…)");
    }
    await ctx.db.patch(args.id, { worksheetUrl: url });
    return null;
  },
});

/** A skill's drafted worksheet body (Markdown) — what `createWorksheetDoc` uploads. */
export const setWorksheetDraft = mutation({
  args: { id: v.id("xTactics"), draft: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError("Tactic not found");
    const draft = args.draft?.trim();
    await ctx.db.patch(args.id, { worksheetDraft: draft ? draft : undefined });
    return null;
  },
});

export const getForWorksheet = internalQuery({
  args: { id: v.id("xTactics") },
  handler: async (ctx, args) => ctx.db.get(args.id),
});

/**
 * The admin "Create worksheet" button. Creates the Google Doc for a tactic in
 * the designated Drive folder (`SKOOL_WORKSHEETS_FOLDER_ID`) through the Drive
 * API with Matthew's stored OAuth refresh token, then links it to the tactic.
 * Body = the skill-drafted `worksheetDraft` when there is one, otherwise the
 * built-in scaffold around the tactic's own text. Setup: `docs/skool-worksheets.md`.
 */
export const createWorksheetDoc = action({
  args: { id: v.id("xTactics") },
  handler: async (ctx, args): Promise<{ worksheetUrl: string }> => {
    await requireOwner(ctx);
    const row = await ctx.runQuery(internal.xTactics.getForWorksheet, { id: args.id });
    if (!row) throw new ConvexError("Tactic not found");
    if (row.worksheetUrl) return { worksheetUrl: row.worksheetUrl };
    if (row.status === "retired") throw new ConvexError("Retired tactics don't get worksheets");

    const env = driveEnvFromProcess();
    const doc = await createGoogleDoc(
      {
        title: worksheetTitle(row),
        html: worksheetHtml(row),
        folderId: env.folderId,
      },
      env
    );
    await ctx.runMutation(api.xTactics.setWorksheet, { id: args.id, worksheetUrl: doc.url });
    return { worksheetUrl: doc.url };
  },
});

/**
 * Create a native Google Doc from Markdown in the designated worksheets folder
 * with no tactic attached — module "Start here" docs, worksheets without a
 * tactic, and the one-time import of drafted files. Owner-only.
 */
export const createDocFromMarkdown = action({
  args: { title: v.string(), markdown: v.string() },
  handler: async (ctx, args): Promise<{ url: string }> => {
    await requireOwner(ctx);
    const title = args.title.trim();
    if (!title) throw new ConvexError("Title is required");
    if (!args.markdown.trim()) throw new ConvexError("Document body is required");
    const env = driveEnvFromProcess();
    const doc = await createGoogleDoc(
      { title, html: documentHtml(args.markdown), folderId: env.folderId },
      env
    );
    return { url: doc.url };
  },
});
