import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { requireOwner } from "./lib/auth";

/** House cap — half of X's 280, on purpose (content/x/voice.md). */
export const MAX_POST_CHARS = 140;

const pillarValidator = v.union(
  v.literal("clockify"),
  v.literal("paper"),
  v.literal("writing"),
  v.literal("claude")
);

/**
 * Insert a batch of draft posts for review. Rejects the whole batch if any
 * post is over the char cap or references a tactic that isn't approved —
 * an unapproved tactic in a published post is exactly the failure mode
 * docs/copy-principles.md §2 exists to prevent.
 */
export const createBatch = mutation({
  args: {
    batchKey: v.string(),
    posts: v.array(
      v.object({
        text: v.string(),
        pillar: pillarValidator,
        tacticIds: v.array(v.string()),
        isLoop: v.boolean(),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    if (args.posts.length === 0) throw new ConvexError("Empty batch");

    for (let i = 0; i < args.posts.length; i++) {
      const post = args.posts[i];
      const text = post.text.trim();
      if (!text) throw new ConvexError(`Post ${i + 1}: empty text`);
      if (text.length > MAX_POST_CHARS) {
        throw new ConvexError(
          `Post ${i + 1}: ${text.length} chars exceeds the ${MAX_POST_CHARS}-char cap`
        );
      }
      if (post.tacticIds.length === 0) {
        throw new ConvexError(`Post ${i + 1}: no tactic ID — every post must trace to the bank`);
      }
      for (const tacticId of post.tacticIds) {
        const tactic = await ctx.db
          .query("xTactics")
          .withIndex("by_tacticId", (q) => q.eq("tacticId", tacticId))
          .unique();
        if (!tactic) throw new ConvexError(`Post ${i + 1}: tactic ${tacticId} not found`);
        if (tactic.status !== "approved") {
          throw new ConvexError(`Post ${i + 1}: tactic ${tacticId} is ${tactic.status}, not approved`);
        }
      }
    }

    const now = Date.now();
    const ids = [];
    for (const post of args.posts) {
      const text = post.text.trim();
      ids.push(
        await ctx.db.insert("xPosts", {
          text,
          pillar: post.pillar,
          tacticIds: post.tacticIds,
          isLoop: post.isLoop,
          batchKey: args.batchKey,
          charCount: text.length,
          status: "draft",
          createdAt: now,
        })
      );
    }
    return { inserted: ids.length, ids };
  },
});

/** Posts in one review batch, in insertion order. */
export const listBatch = query({
  args: { batchKey: v.string() },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    return await ctx.db
      .query("xPosts")
      .withIndex("by_batchKey", (q) => q.eq("batchKey", args.batchKey))
      .take(500);
  },
});

/** Posts by lifecycle status (e.g. everything awaiting upload). */
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("draft"),
      v.literal("edited"),
      v.literal("signedOff"),
      v.literal("rejected"),
      v.literal("posted")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    return await ctx.db
      .query("xPosts")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .take(Math.min(args.limit ?? 200, 1000));
  },
});

/** Distinct batch keys, newest first, for the review UI's batch picker. */
export const listBatchKeys = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const recent = await ctx.db.query("xPosts").order("desc").take(1000);
    const keys: string[] = [];
    for (const post of recent) {
      if (!keys.includes(post.batchKey)) keys.push(post.batchKey);
    }
    return keys;
  },
});

/** Matthew's sign-off. Only reviewable posts (draft/edited) can be signed off. */
export const signOff = mutation({
  args: { id: v.id("xPosts"), reviewNote: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const post = await ctx.db.get(args.id);
    if (!post) throw new ConvexError("Post not found");
    if (post.status !== "draft" && post.status !== "edited") {
      throw new ConvexError(`Cannot sign off a ${post.status} post`);
    }
    await ctx.db.patch(args.id, {
      status: "signedOff",
      signedOffAt: Date.now(),
      reviewNote: args.reviewNote ?? post.reviewNote,
    });
    return null;
  },
});

export const reject = mutation({
  args: { id: v.id("xPosts"), reviewNote: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const post = await ctx.db.get(args.id);
    if (!post) throw new ConvexError("Post not found");
    if (post.status === "posted") throw new ConvexError("Cannot reject a posted post");
    await ctx.db.patch(args.id, {
      status: "rejected",
      reviewNote: args.reviewNote ?? post.reviewNote,
    });
    return null;
  },
});

/** Edit the text during review; re-validates the cap and marks it `edited`. */
export const editText = mutation({
  args: { id: v.id("xPosts"), text: v.string(), reviewNote: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const post = await ctx.db.get(args.id);
    if (!post) throw new ConvexError("Post not found");
    if (post.status === "posted") throw new ConvexError("Cannot edit a posted post");
    const text = args.text.trim();
    if (!text) throw new ConvexError("Empty text");
    if (text.length > MAX_POST_CHARS) {
      throw new ConvexError(`${text.length} chars exceeds the ${MAX_POST_CHARS}-char cap`);
    }
    await ctx.db.patch(args.id, {
      text,
      charCount: text.length,
      status: "edited",
      reviewNote: args.reviewNote ?? post.reviewNote,
    });
    return null;
  },
});

/** Everything approved for upload — the deploy queue. */
export const listSignedOff = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    return await ctx.db
      .query("xPosts")
      .withIndex("by_status", (q) => q.eq("status", "signedOff"))
      .take(500);
  },
});
