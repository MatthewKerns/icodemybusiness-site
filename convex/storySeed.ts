/**
 * One-time import of the story-intake answers gathered on 2026-09-06.
 *
 * Run once by the deploy session:
 *   npx convex run storySeed:seedFromIntake
 *
 * Idempotent — a second run does nothing.
 *
 * WHY THIS FILE IS FUSSY ABOUT PROVENANCE. The intake conversation produced two
 * different kinds of material, and storing them identically would quietly turn
 * one into the other:
 *
 *   VERBATIM   — Matthew typed these words. Quotable directly in copy.
 *   SELECTED   — Matthew chose an option from a list Claude wrote. The decision
 *                is his; the phrasing is not. Must be confirmed in his own
 *                words before any of it reaches a visitor.
 *
 * `docs/copy-principles.md` §2 is about who asserts a claim. A selection is a
 * real assertion by Matthew — he picked "the money ran out" over three
 * alternatives — but the sentence around it is Claude's, and copy that quotes
 * it as his voice would be putting words in his mouth. Hence the marker on
 * every seeded fragment, and hence `verbatim: false` meaning "get his wording
 * before publishing this".
 */

import { internalMutation } from "./_generated/server";

interface SeedRow {
  text: string;
  questionIds: string[];
  verbatim: boolean;
  note: string;
}

const SEED_SOURCE = "seed:intake-2026-09-06";

const ROWS: SeedRow[] = [
  // ---------------------------------------------------------------- verbatim
  {
    text: "the company I started",
    questionIds: ["A1"],
    verbatim: true,
    note: "What broke. Typed by Matthew, 2026-09-06.",
  },
  {
    text: "months I can't get back hurts the most, and money",
    questionIds: ["A2"],
    verbatim: true,
    note: "What it cost. Typed by Matthew, 2026-09-06. Note the order — the months came first, unprompted.",
  },
  {
    text: "every time we looked at our profit numbers for a couple years stretch",
    questionIds: ["A1"],
    verbatim: true,
    note:
      "Typed by Matthew, 2026-09-06, in place of choosing one of four single-day options. " +
      "Structurally important: his story has no single dramatic day, it has one moment on repeat for two years. " +
      "That is closer to what a reader is living through right now than a war story would be.",
  },
  {
    text:
      "empty bank account, lower and lower zeros - the stocks ran out , and then I burned throguh remaining savings, " +
      "and then I started making software, and getting paid for it, which has had its own set of challenges",
    questionIds: ["A3", "B1"],
    verbatim: true,
    note:
      "Typed by Matthew, 2026-09-06, unedited — typo and spacing preserved, because a verbatim record that gets tidied is no longer verbatim. " +
      "Covers the descent and the turn in one breath. \"lower and lower zeros\" is his phrase and is the strongest line in the intake.",
  },

  // ---------------------------------------------------------------- selected
  {
    text: "I looked at the numbers alone. My family lived with the result without seeing the screen.",
    questionIds: ["A1", "A6"],
    verbatim: false,
    note: "SELECTED, not typed: Matthew chose \"Me alone, family downstream\". Wording is Claude's — confirm in his words before publishing.",
  },
  {
    text: "Up some months, down others. Enough to keep hoping, never enough to clear the bar.",
    questionIds: ["A1"],
    verbatim: false,
    note: "SELECTED, not typed: Matthew chose \"Up, down, never enough\". Wording is Claude's — confirm before publishing.",
  },
  {
    text: "I thought that was just what running a business was.",
    questionIds: ["A4"],
    verbatim: false,
    note:
      "SELECTED, not typed: Matthew chose \"This is just how it is\". Wording is Claude's — confirm before publishing. " +
      "This is the load-bearing belief: it is also what the reader believes right now, which is what lets the email describe their present rather than lecture from the far side.",
  },
  {
    text: "The money ran out. It wasn't a decision — the arithmetic made it.",
    questionIds: ["A5"],
    verbatim: false,
    note: "SELECTED, not typed: Matthew chose \"The money ran out\" over three alternatives. Wording is Claude's — confirm before publishing.",
  },
  {
    text: "There was no insight. I needed money, software paid, so I did software.",
    questionIds: ["B1"],
    verbatim: false,
    note:
      "SELECTED, not typed: Matthew chose \"No insight — I needed money\" over three options offering a tidier realization. " +
      "The absence of an epiphany is the answer, not a gap. Wording is Claude's — confirm before publishing.",
  },
  {
    text: "Feast and famine. Client work arrives in waves, so the numbers still move up and down — just for different reasons.",
    questionIds: ["B1"],
    verbatim: false,
    note:
      "SELECTED, not typed: Matthew chose \"Feast and famine\" as what \"its own set of challenges\" meant. Wording is Claude's — confirm before publishing. " +
      "Same up-down-never-enough shape as the original wall, which is why it lands.",
  },
];

export const seedFromIntake = internalMutation({
  args: {},
  handler: async (ctx): Promise<{ inserted: number; skipped: boolean }> => {
    const existing = await ctx.db
      .query("storyFragments")
      .withIndex("by_createdAt")
      .take(500);
    if (existing.some((r) => r.source === SEED_SOURCE)) {
      return { inserted: 0, skipped: true };
    }

    let inserted = 0;
    for (const row of ROWS) {
      await ctx.db.insert("storyFragments", {
        text: row.text,
        questionIds: row.questionIds,
        routingSource: "seed",
        routingPending: false,
        source: SEED_SOURCE,
        note: `${row.verbatim ? "VERBATIM" : "SELECTED"} — ${row.note}`,
        createdAt: Date.now(),
      });
      inserted++;
    }
    return { inserted, skipped: false };
  },
});
