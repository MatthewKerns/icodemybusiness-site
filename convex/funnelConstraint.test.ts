/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";
import {
  analyzeFunnel,
  MIN_ARRIVALS,
  MIN_STEP_N,
  type StepCount,
  type StepKey,
} from "./lib/funnelConstraint";

const modules = import.meta.glob("./**/*.ts");

const OWNER = {
  subject: "user_owner",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|user_owner",
  email: "matt@icodemybusiness.com",
  emailVerified: true,
};
const OUTSIDER = {
  subject: "user_outsider",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|user_outsider",
  email: "someone@gmail.com",
  emailVerified: true,
};

const OWNER_DOMAINS_VAR = "OWNER_EMAIL_DOMAINS";
let savedDomains: string | undefined;
beforeEach(() => {
  savedDomains = process.env[OWNER_DOMAINS_VAR];
  process.env[OWNER_DOMAINS_VAR] = "icodemybusiness.com";
});
afterEach(() => {
  if (savedDomains === undefined) delete process.env[OWNER_DOMAINS_VAR];
  else process.env[OWNER_DOMAINS_VAR] = savedDomains;
});

const ORDER: StepKey[] = [
  "arrived",
  "splash_entered",
  "assessment_started",
  "answering",
  "recap",
  "email",
  "book_click",
  "booked",
];

function steps(
  counts: Partial<Record<StepKey, number>>,
  extra: Partial<Record<StepKey, Partial<StepCount>>> = {},
): StepCount[] {
  return ORDER.map((key) => ({
    key,
    label: key,
    n: counts[key] ?? 0,
    measured: key !== "booked",
    source: key,
    ...extra[key],
  }));
}

const NOW = 1_800_000_000_000;
const SINCE = NOW - 30 * 86_400_000;
const base = { windowDays: 30, since: SINCE, until: NOW };

describe("analyzeFunnel", () => {
  it("names traffic as the constraint below the arrivals floor, with the numbers", () => {
    const r = analyzeFunnel({ ...base, steps: steps({ arrived: MIN_ARRIVALS - 1, splash_entered: 3 }) });
    expect(r.constraint.kind).toBe("traffic");
    expect(r.constraint.why[0]).toContain(`${MIN_ARRIVALS - 1} page views`);
    expect(r.constraint.why[0]).toContain(`${MIN_ARRIVALS}`);
  });

  it("picks the transition that loses the most people, and shows the comparison", () => {
    const r = analyzeFunnel({
      ...base,
      steps: steps({
        arrived: 500,
        splash_entered: 200,
        assessment_started: 60, // loses 140 — the worst
        answering: 50,
        recap: 40,
        email: 30,
        book_click: 25,
      }),
    });
    expect(r.constraint.kind).toBe("step");
    expect(r.constraint.stepKey).toBe("assessment_started");
    expect(r.constraint.why[0]).toContain("200 reached");
    expect(r.constraint.why[0]).toContain("60 went on");
    expect(r.constraint.why[0]).toContain("30%");
    expect(r.constraint.why[1]).toContain("For comparison");
  });

  it("never blames page views → splash (views are not people)", () => {
    const r = analyzeFunnel({
      ...base,
      steps: steps({
        arrived: 1000,
        splash_entered: 100,
        assessment_started: 90,
        answering: 80,
        recap: 70,
        email: 60,
        book_click: 50,
      }),
    });
    const first = r.transitions.find((t) => t.from === "arrived")!;
    expect(first.excluded).toBeDefined();
    expect(r.constraint.stepKey).not.toBe("splash_entered");
  });

  it("excludes a step instrumented inside the window and says so in gaps", () => {
    const r = analyzeFunnel({
      ...base,
      steps: steps(
        { arrived: 500, splash_entered: 5, assessment_started: 100, answering: 90, recap: 80, email: 70, book_click: 60 },
        { splash_entered: { firstSeenAt: SINCE + 86_400_000 } },
      ),
    });
    expect(r.gaps.some((g) => g.includes("first recorded"))).toBe(true);
    const t = r.transitions.find((t) => t.from === "splash_entered")!;
    expect(t.excluded).toContain("instrumented");
  });

  it("reports insufficient when no per-person step reaches the entrant floor", () => {
    const r = analyzeFunnel({
      ...base,
      steps: steps({
        arrived: 500,
        splash_entered: MIN_STEP_N - 1,
        assessment_started: 10,
        answering: 8,
        recap: 5,
        email: 4,
        book_click: 3,
      }),
    });
    expect(r.constraint.kind).toBe("insufficient");
  });

  it("always lists the unmeasured booking step as a gap", () => {
    const r = analyzeFunnel({ ...base, steps: steps({ arrived: 1 }) });
    expect(r.gaps.some((g) => g.toLowerCase().includes("booked"))).toBe(true);
  });
});

describe("adminFunnelConstraint (Convex)", () => {
  it("refuses an outsider and an anonymous caller", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(OUTSIDER).query(api.funnelConstraint.adminFunnelConstraint, {}),
    ).rejects.toThrow();
    await expect(t.query(api.funnelConstraint.adminFunnelConstraint, {})).rejects.toThrow();
  });

  it("counts unique sessions per step for the owner, within the window", async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert("pageViews", { page: "/", timestamp: now - 1000 });
      await ctx.db.insert("pageViews", { page: "/", timestamp: now - 40 * 86_400_000 }); // outside 30d
      const row = (name: string, sessionId: string, props?: unknown) =>
        ctx.db.insert("visitorEvents", {
          name,
          category: "decision",
          sessionId,
          props,
          timestamp: now - 1000,
        });
      await row("splash_entered", "s1");
      await row("splash_entered", "s1"); // same session twice → 1
      await row("splash_entered", "s2");
      await row("assessment_started", "s1");
      await row("discovery_stage_advanced", "s1", { stage: 1 });
      await row("discovery_stage_advanced", "s1", { stage: 5 });
      await row("discovery_assessment_completed", "s1");
      await row("book_call_clicked", "s1", { placement: "discovery-result" });
    });

    const r = await t
      .withIdentity(OWNER)
      .query(api.funnelConstraint.adminFunnelConstraint, { windowDays: 30 });
    const n = Object.fromEntries(r.steps.map((s) => [s.key, s.n]));
    expect(n).toMatchObject({
      arrived: 1,
      splash_entered: 2,
      assessment_started: 1,
      answering: 1,
      recap: 1,
      email: 1,
      book_click: 1,
      booked: 0,
    });
    expect(r.constraint.kind).toBe("traffic");
    expect(r.steps.find((s) => s.key === "booked")!.measured).toBe(false);
    expect(r.sampled.truncated).toBe(false);
  });
});
