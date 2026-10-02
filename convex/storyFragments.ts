/**
 * The story vault.
 *
 * Drop a fragment in; it gets routed to the questions it answers and nothing
 * else happens to it. `text` is written once and never touched again — not by
 * the classifier, not by an edit path, not by a summariser. Everything an agent
 * later quotes is therefore Matthew's own words, which is what
 * `docs/copy-principles.md` §2 requires.
 *
 * Owner-gated throughout via `requireOwner`, which derives authorisation from
 * the verified Clerk identity rather than `users.role`. This is the most
 * personal data on the site.
 */

import { v, ConvexError } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
  internalAction,
} from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { requireOwner } from "./lib/auth";
import { callClaudeTool } from "./lib/anthropic";
import {
  STORY_QUESTIONS,
  BLOCKING_QUESTION_IDS,
  isStoryQuestionId,
} from "../src/content/story-questions";

const MAX_FRAGMENT_CHARS = 20000;

export interface CoverageRow {
  id: string;
  group: string;
  blocking: boolean;
  live: boolean;
  question: string;
  hint: string;
  fragmentCount: number;
}

/** Drop a fragment in. Returns immediately; routing happens in the background. */
export const add = mutation({
  args: { text: v.string(), source: v.optional(v.string()) },
  handler: async (ctx, args): Promise<Id<"storyFragments">> => {
    await requireOwner(ctx);
    const text = args.text.trim();
    if (!text) throw new ConvexError("Nothing to save");
    if (text.length > MAX_FRAGMENT_CHARS) {
      throw new ConvexError("That is longer than one fragment should be");
    }

    const id = await ctx.db.insert("storyFragments", {
      text,
      questionIds: [],
      routingSource: "auto",
      routingPending: true,
      source: args.source ?? "admin",
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.storyFragments.classify, {
      fragmentId: id,
    });
    return id;
  },
});

/**
 * Ask the model which questions a fragment speaks to.
 *
 * It returns ids only. It is never asked to rewrite, summarise or improve the
 * fragment, and it has no path to do so — `applyRouting` writes `questionIds`
 * and nothing else.
 */
export const classify = internalAction({
  args: { fragmentId: v.id("storyFragments") },
  handler: async (ctx, args): Promise<null> => {
    const fragment = await ctx.runQuery(
      internal.storyFragments.internalGet,
      { fragmentId: args.fragmentId }
    );
    if (!fragment) return null;

    const catalogue = STORY_QUESTIONS.map(
      (q) => `${q.id} [${q.group}] ${q.question}`
    ).join("\n");

    const result = await callClaudeTool<{ questionIds: string[] }>(
      [
        "You are filing one fragment of a business owner's personal story against a fixed question set.",
        "Return only the ids of questions the fragment genuinely helps answer.",
        "Prefer few, precise ids over many loose ones. Zero is a valid answer.",
        "You are filing, not interpreting: never rewrite, summarise or judge the fragment.",
      ].join(" "),
      `QUESTIONS\n${catalogue}\n\nFRAGMENT\n${fragment.text}`,
      {
        name: "file_fragment",
        description: "Return the question ids this fragment helps answer.",
        input_schema: {
          type: "object",
          properties: {
            questionIds: {
              type: "array",
              items: { type: "string" },
              description: "Question ids, e.g. [\"A3\",\"B1\"]. May be empty.",
            },
          },
          required: ["questionIds"],
        },
      },
      1000
    );

    await ctx.runMutation(internal.storyFragments.applyRouting, {
      fragmentId: args.fragmentId,
      questionIds: result?.questionIds ?? [],
      failed: result === null,
    });
    return null;
  },
});

/** Store the classifier's proposal. Only ever touches routing fields. */
export const applyRouting = internalMutation({
  args: {
    fragmentId: v.id("storyFragments"),
    questionIds: v.array(v.string()),
    failed: v.boolean(),
  },
  handler: async (ctx, args): Promise<null> => {
    const fragment = await ctx.db.get(args.fragmentId);
    if (!fragment) return null;
    // A hand-corrected routing outranks a late-arriving proposal.
    if (fragment.routingSource === "manual") return null;

    await ctx.db.patch(args.fragmentId, {
      questionIds: args.questionIds.filter(isStoryQuestionId),
      routingPending: false,
      routingError: args.failed
        ? "Could not file this automatically — route it by hand."
        : undefined,
    });
    return null;
  },
});

export const internalGet = internalQuery({
  args: { fragmentId: v.id("storyFragments") },
  handler: async (ctx, args) => await ctx.db.get(args.fragmentId),
});

/** Correct the routing by hand. Never touches `text`. */
export const setRouting = mutation({
  args: {
    fragmentId: v.id("storyFragments"),
    questionIds: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<null> => {
    await requireOwner(ctx);
    const unknown = args.questionIds.filter((id) => !isStoryQuestionId(id));
    if (unknown.length) {
      throw new ConvexError(`Unknown question id: ${unknown.join(", ")}`);
    }
    await ctx.db.patch(args.fragmentId, {
      questionIds: args.questionIds,
      routingSource: "manual",
      routingPending: false,
      routingError: undefined,
    });
    return null;
  },
});

/** Soft delete. Nothing he wrote is ever removed from the database. */
export const archive = mutation({
  args: { fragmentId: v.id("storyFragments"), undo: v.optional(v.boolean()) },
  handler: async (ctx, args): Promise<null> => {
    await requireOwner(ctx);
    await ctx.db.patch(args.fragmentId, {
      archivedAt: args.undo ? undefined : Date.now(),
    });
    return null;
  },
});

export const list = query({
  args: { includeArchived: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    const rows = await ctx.db
      .query("storyFragments")
      .withIndex("by_createdAt")
      .order("desc")
      .take(1000);
    return args.includeArchived
      ? rows
      : rows.filter((r) => r.archivedAt === undefined);
  },
});

/**
 * Per-question fragment counts, plus which blocking questions are still empty.
 *
 * Counted in the handler rather than by index: Convex cannot index membership
 * of an array field, and this is one person's notes — hundreds of rows, not
 * millions. Revisit if that stops being true.
 */
export const coverage = query({
  args: {},
  handler: async (
    ctx
  ): Promise<{
    rows: CoverageRow[];
    blockingTotal: number;
    blockingCovered: number;
    unrouted: number;
  }> => {
    await requireOwner(ctx);
    const rows = await ctx.db.query("storyFragments").take(2000);
    const live = rows.filter((r) => r.archivedAt === undefined);

    const counts: Record<string, number> = {};
    let unrouted = 0;
    for (const r of live) {
      if (!r.routingPending && r.questionIds.length === 0) unrouted++;
      for (const qid of r.questionIds) {
        counts[qid] = (counts[qid] ?? 0) + 1;
      }
    }

    const out: CoverageRow[] = STORY_QUESTIONS.map((q) => ({
      id: q.id,
      group: q.group,
      blocking: q.blocking,
      live: q.live,
      question: q.question,
      hint: q.hint,
      fragmentCount: counts[q.id] ?? 0,
    }));

    return {
      rows: out,
      blockingTotal: BLOCKING_QUESTION_IDS.length,
      blockingCovered: BLOCKING_QUESTION_IDS.filter((id) => (counts[id] ?? 0) > 0)
        .length,
      unrouted,
    };
  },
});

/** Seed a fragment with its routing already known (migration path). */
export const seed = internalMutation({
  args: {
    text: v.string(),
    questionIds: v.array(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"storyFragments">> => {
    return await ctx.db.insert("storyFragments", {
      text: args.text,
      questionIds: args.questionIds.filter(isStoryQuestionId),
      routingSource: "seed",
      routingPending: false,
      source: "seed",
      note: args.note,
      createdAt: Date.now(),
    });
  },
});
