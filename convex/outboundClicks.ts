/**
 * Counting clicks on links we recommend but do not own.
 *
 * Exists because "how many people actually clicked through to Clockify" cannot
 * be answered from our side otherwise — the click happens on their domain. The
 * number decides whether setting up an affiliate relationship is worth doing;
 * until it is, the link is a plain recommendation with no money attached.
 */

import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";

/** Internal-only: the redirect handler is the sole writer. */
export const record = internalMutation({
  args: { slug: v.string() },
  handler: async (ctx, args): Promise<null> => {
    await ctx.db.insert("outboundClicks", {
      slug: args.slug,
      createdAt: Date.now(),
    });
    return null;
  },
});

/** Admin-gated counts, newest activity first. */
export const adminCounts = query({
  args: {},
  handler: async (ctx): Promise<{ slug: string; clicks: number; lastAt: number }[]> => {
    await requireRole(ctx, "admin");
    const rows = await ctx.db.query("outboundClicks").collect();
    // A plain record rather than a Map: this repo's tsconfig target predates
    // downlevelIteration, so spreading a Map iterator is a type error.
    const bySlug: Record<string, { clicks: number; lastAt: number }> = {};
    for (const r of rows) {
      const cur = bySlug[r.slug] ?? { clicks: 0, lastAt: 0 };
      bySlug[r.slug] = {
        clicks: cur.clicks + 1,
        lastAt: Math.max(cur.lastAt, r.createdAt),
      };
    }
    return Object.keys(bySlug)
      .map((slug) => ({ slug, ...bySlug[slug] }))
      .sort((a, b) => b.clicks - a.clicks);
  },
});
