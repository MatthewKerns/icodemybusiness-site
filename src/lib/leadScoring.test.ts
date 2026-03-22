import { describe, it, expect } from "vitest";
import { scoreLead } from "./leadScoring";

describe("scoreLead", () => {
  it('returns 15 for "referral"', () => {
    expect(scoreLead("referral")).toBe(15);
  });

  it('returns 10 for "youtube"', () => {
    expect(scoreLead("youtube")).toBe(10);
  });

  it("returns 5 for undefined", () => {
    expect(scoreLead(undefined)).toBe(5);
  });

  it("returns 5 for unknown source", () => {
    expect(scoreLead("twitter")).toBe(5);
  });

  it("returns 5 for empty string", () => {
    expect(scoreLead("")).toBe(5);
  });
});
