/**
 * Invariants for the homepage letter's content.
 *
 * These exist because today's worst defects were all invisible to the suite:
 * a contradictory guard that typechecked, a legend clipped by a viewBox, a
 * chart cut off on a phone. None of those are unit-testable, but the *content*
 * constraints behind the page are — and those are the ones that quietly regress
 * when someone edits copy without knowing what it was carrying.
 */
import { describe, it, expect } from "vitest";
import { VSL, PROBLEM, STORY, PATHS, OBJECTIONS, GUARANTEE, CTA } from "../landing";

/** Every string a visitor could read, flattened. */
function allCopy(): string[] {
  return [
    VSL.headline,
    VSL.subhead,
    VSL.posterEyebrow,
    PROBLEM.heading,
    ...PROBLEM.body,
    STORY.heading,
    ...STORY.body,
    ...STORY.proofPoints.flatMap((p) => [p.label, p.detail]),
    ...PATHS.flatMap((p) => [p.name, p.forWho, p.what, p.timeline, p.commitment]),
    ...OBJECTIONS.flatMap((o) => [o.q, o.a]),
    GUARANTEE.heading,
    GUARANTEE.body,
    CTA.primary,
    CTA.secondary,
    CTA.closingHeading,
    CTA.closingBody,
  ];
}

describe("landing content — standing constraints", () => {
  it("names no price anywhere (R-009)", () => {
    // The whole no-visible-pricing decision lives or dies on this. Checked
    // against the content module rather than rendered HTML, because grepping
    // built HTML for /\$\d/ matches Next.js RSC module ids and cries wolf.
    // Amounts, not the word. "priced like one" is deliberate copy — it answers
    // the cost objection head-on without naming a number, and is the closest
    // thing the page has to a tier signal. An earlier version of this regex
    // flagged it, which would have pushed someone to weaken the good sentence.
    const offenders = allCopy().filter((s) =>
      /\$\s?\d|\b\d[\d,]*\s?[kK]\b|\bUSD\b|\b\d[\d,]*\s*(dollars|euros|pounds)\b/.test(s)
    );
    expect(offenders).toEqual([]);
  });

  it("keeps the commitment lines, which are the only tier signal", () => {
    // The paths redesign replaced four cards with a diagram. The diagram can
    // show depth and duration but cannot show selectivity, so these strings are
    // load-bearing: drop them and "tens of thousands without a number" goes too.
    for (const path of PATHS) {
      expect(path.commitment.trim().length).toBeGreaterThan(10);
    }
  });

  it("does not hardcode a call duration (R-001 lesson)", () => {
    // The site once promised a 15-minute call while Calendly's only live event
    // was 60 minutes. Durations belong in the booking surface, which reads the
    // real event, not in the letter.
    const offenders = allCopy().filter((s) =>
      /\b\d+[- ]?(minute|min)\b/i.test(s)
    );
    expect(offenders).toEqual([]);
  });

  it("avoids reassurance-shaped copy (R-008)", () => {
    // "no pitch, no pressure, no obligation" was removed deliberately: it reads
    // as reassurance and undercuts the positioning. Answer objections instead.
    const offenders = allCopy().filter((s) =>
      /no pressure|no obligation|no pitch/i.test(s)
    );
    expect(offenders).toEqual([]);
  });
});

describe("PATHS plot data", () => {
  it("gives every path a place on the chart", () => {
    // The explicit Path[] annotation makes a missing `plot` a compile error;
    // this catches a plot that exists but is nonsense.
    for (const p of PATHS) {
      expect(p.plot.depth).toBeGreaterThanOrEqual(1);
      expect(p.plot.depth).toBeLessThanOrEqual(4);
      expect(p.plot.shortTimeline.trim()).not.toBe("");
      if (p.plot.weeks !== null) expect(p.plot.weeks).toBeGreaterThan(0);
    }
  });

  it("orders the four routes by depth with no ties", () => {
    // Two paths at the same depth would draw on top of each other.
    const depths = PATHS.map((p) => p.plot.depth);
    expect(new Set(depths).size).toBe(PATHS.length);
  });

  it("marks exactly one path as the starting point", () => {
    expect(PATHS.filter((p) => p.highlight)).toHaveLength(1);
  });
});
