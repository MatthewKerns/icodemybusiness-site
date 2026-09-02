import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireOwner } from "./lib/auth";

const kindValidator = v.union(
  v.literal("video"),
  v.literal("audio"),
  v.literal("doc"),
  v.literal("plan"),
  v.literal("image"),
  v.literal("other")
);

/**
 * Register a Drive file as a source asset. Idempotent on driveFileId: a
 * re-register returns the existing row so the ingest skill can re-scan the
 * folder without creating duplicates.
 */
export const register = mutation({
  args: {
    driveFileId: v.string(),
    driveUrl: v.string(),
    name: v.string(),
    mimeType: v.optional(v.string()),
    kind: kindValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const existing = await ctx.db
      .query("xAssets")
      .withIndex("by_driveFileId", (q) => q.eq("driveFileId", args.driveFileId))
      .unique();
    if (existing) return { id: existing._id, created: false };

    const id = await ctx.db.insert("xAssets", {
      driveFileId: args.driveFileId,
      driveUrl: args.driveUrl,
      name: args.name,
      mimeType: args.mimeType,
      kind: args.kind,
      status: "unprocessed",
      note: args.note,
      createdAt: Date.now(),
    });
    return { id, created: true };
  },
});

/** Store an extracted transcript / text content for an asset. */
export const setTranscript = mutation({
  args: { id: v.id("xAssets"), transcript: v.string() },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError("Asset not found");
    await ctx.db.patch(args.id, {
      transcript: args.transcript,
      status: "transcribed",
      processedAt: Date.now(),
    });
    return null;
  },
});

/** Mark an asset fully processed (tactics extracted) or deliberately skipped. */
export const markProcessed = mutation({
  args: {
    id: v.id("xAssets"),
    status: v.union(v.literal("processed"), v.literal("skipped")),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const row = await ctx.db.get(args.id);
    if (!row) throw new ConvexError("Asset not found");
    await ctx.db.patch(args.id, {
      status: args.status,
      note: args.note ?? row.note,
      processedAt: Date.now(),
    });
    return null;
  },
});

export const listUnprocessed = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    return await ctx.db
      .query("xAssets")
      .withIndex("by_status", (q) => q.eq("status", "unprocessed"))
      .take(200);
  },
});

export const get = query({
  args: { id: v.id("xAssets") },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    return await ctx.db.get(args.id);
  },
});
