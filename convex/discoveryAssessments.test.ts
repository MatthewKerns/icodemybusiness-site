/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

/** requireRole("admin") needs a users row, not just the JWT: seed the owner. */
async function asAdmin(t: TestConvex<typeof schema>) {
  const owner = t.withIdentity(OWNER);
  await owner.mutation(api.users.ensureCurrentUser, {});
  return owner;
}

const SESSION = "da_test_1";

const VISITOR = {
  subject: "user_visitor",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|user_visitor",
  email: "visitor@example.com",
  emailVerified: true,
};
const OTHER = { ...VISITOR, subject: "user_other", tokenIdentifier: "https://clerk.test|user_other" };
const OWNER = {
  ...VISITOR,
  subject: "user_owner",
  tokenIdentifier: "https://clerk.test|user_owner",
  email: "matt@icodemybusiness.com",
};

const ANSWERS = {
  problem: { summary: "chasing invoices", quotes: ["chasing"] },
  cost: { summary: "a day a week", quotes: [] },
  history: { summary: "two years, tried a VA", quotes: [] },
  stakes: { summary: "can't grow", quotes: [] },
  outcome: { summary: "invoices go out alone", quotes: [] },
};

let savedDomains: string | undefined;
let savedKey: string | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  savedDomains = process.env.OWNER_EMAIL_DOMAINS;
  savedKey = process.env.ANTHROPIC_API_KEY;
  process.env.OWNER_EMAIL_DOMAINS = "icodemybusiness.com";
  // No key: the processor takes its fallback path, so these tests need no
  // network stub and stay focused on the mutations.
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  if (savedDomains === undefined) delete process.env.OWNER_EMAIL_DOMAINS;
  else process.env.OWNER_EMAIL_DOMAINS = savedDomains;
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedKey;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function sessionAtRecap(opts: { confirmed?: boolean; stage?: number } = {}) {
  const t = convexTest(schema, modules);
  await t.mutation(api.agentSessions.getOrCreate, {
    sessionId: SESSION,
    agentKind: "discovery-assessment",
    source: "homepage",
  });
  await t.mutation(api.agentSessions.updateDiscoveryState, {
    sessionId: SESSION,
    discoveryState: {
      stage: opts.stage ?? 5,
      followUpsUsed: 0,
      answers: ANSWERS,
      recapConfirmed: opts.confirmed ?? false,
    },
  });
  return t;
}

describe("confirmRecap", () => {
  it("only works at the recap stage", async () => {
    const t = await sessionAtRecap({ stage: 2 });
    await expect(
      t.mutation(api.discoveryAssessments.confirmRecap, { sessionId: SESSION })
    ).rejects.toThrow(/recap/);
  });

  it("flags the session as confirmed", async () => {
    const t = await sessionAtRecap();
    await t.mutation(api.discoveryAssessments.confirmRecap, { sessionId: SESSION });
    const s = await t.query(api.agentSessions.getBySessionId, { sessionId: SESSION });
    expect((s?.discoveryState as { recapConfirmed: boolean }).recapConfirmed).toBe(true);
  });
});

describe("submit", () => {
  it("rejects an unconfirmed recap", async () => {
    const t = await sessionAtRecap({ confirmed: false });
    await expect(
      t.mutation(api.discoveryAssessments.submit, {
        sessionId: SESSION,
        email: "v@example.com",
      })
    ).rejects.toThrow(/Confirm the recap/);
  });

  it("rejects a bad email", async () => {
    const t = await sessionAtRecap({ confirmed: true });
    await expect(
      t.mutation(api.discoveryAssessments.submit, {
        sessionId: SESSION,
        email: "not-an-email",
      })
    ).rejects.toThrow();
  });

  it("creates the lead and the assessment, snapshots the five answers, and finalizes", async () => {
    const t = await sessionAtRecap({ confirmed: true });
    const id = await t.mutation(api.discoveryAssessments.submit, {
      sessionId: SESSION,
      email: "Visitor@Example.com",
      name: "Vee",
    });
    expect(id).toBeTruthy();

    const lead = await t.query(api.leads.getLeadByEmail, { email: "visitor@example.com" });
    expect(lead).toMatchObject({ source: "discovery-assessment", sessionId: SESSION, name: "Vee" });

    const before = await t.query(api.discoveryAssessments.getBySessionId, { sessionId: SESSION });
    expect(before?.status).toBe("processing");
    expect(before?.answers.map((a) => a.key)).toEqual([
      "problem",
      "cost",
      "history",
      "stakes",
      "outcome",
    ]);
    expect(before?.answers[0]).toMatchObject({
      summary: "chasing invoices",
      quotes: ["chasing"],
    });

    // Background processor (fallback path, no API key) still lands on "ready".
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const after = await t.query(api.discoveryAssessments.getBySessionId, { sessionId: SESSION });
    expect(after?.status).toBe("ready");
    expect(after?.summary?.problem).toBe("chasing invoices");
    expect(after?.summary?.recommendedPath).toBe("diagnostic");

    const session = await t.query(api.agentSessions.getBySessionId, { sessionId: SESSION });
    expect(session?.status).toBe("completed");
    expect(session?.visitorEmail).toBe("visitor@example.com");
  });

  it("is idempotent for the same session", async () => {
    const t = await sessionAtRecap({ confirmed: true });
    const a = await t.mutation(api.discoveryAssessments.submit, {
      sessionId: SESSION,
      email: "v@example.com",
    });
    const b = await t.mutation(api.discoveryAssessments.submit, {
      sessionId: SESSION,
      email: "v@example.com",
    });
    expect(b).toBe(a);
  });

  it("binds the signed-in identity, never a client-supplied id", async () => {
    const t = await sessionAtRecap({ confirmed: true });
    await t.withIdentity(VISITOR).mutation(api.discoveryAssessments.submit, {
      sessionId: SESSION,
      email: "v@example.com",
    });
    const doc = await (await asAdmin(t)).query(
      api.discoveryAssessments.adminListAssessments,
      {}
    );
    expect(doc[0].clerkUserId).toBe("user_visitor");
  });

  it("carries a verbatim correction into the snapshot", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.agentSessions.getOrCreate, {
      sessionId: SESSION,
      agentKind: "discovery-assessment",
    });
    await t.mutation(api.agentSessions.updateDiscoveryState, {
      sessionId: SESSION,
      discoveryState: {
        stage: 5,
        followUpsUsed: 0,
        answers: ANSWERS,
        recapConfirmed: true,
        correction: "It's two days, not one",
      },
    });
    await t.mutation(api.discoveryAssessments.submit, {
      sessionId: SESSION,
      email: "v@example.com",
    });
    const doc = await t.query(api.discoveryAssessments.getBySessionId, { sessionId: SESSION });
    expect(doc?.answers.at(-1)).toMatchObject({
      key: "correction",
      summary: "It's two days, not one",
    });
  });
});

describe("internal brief never leaks", () => {
  it("public and portal queries omit internalBrief; admin sees it", async () => {
    const t = await sessionAtRecap({ confirmed: true });
    const id = await t.withIdentity(VISITOR).mutation(api.discoveryAssessments.submit, {
      sessionId: SESSION,
      email: "v@example.com",
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    await t.mutation(internal.discoveryAssessments.internalStoreFinalResult, {
      assessmentId: id,
      summary: {
        problem: "p",
        impact: "i",
        history: "h",
        stakes: "s",
        idealOutcome: "o",
        recommendedPath: "build",
        thisWeekAction: "a",
      },
      internalBrief: "SECRET BRIEF",
    });

    const pub = await t.query(api.discoveryAssessments.getBySessionId, { sessionId: SESSION });
    expect(JSON.stringify(pub)).not.toContain("SECRET BRIEF");
    expect(pub).not.toHaveProperty("internalBrief");
    expect(pub).not.toHaveProperty("clerkUserId");
    expect(pub?.claimed).toBe(true);

    const portal = await t.withIdentity(VISITOR).query(
      api.discoveryAssessments.portalListForUser,
      {}
    );
    expect(portal).toHaveLength(1);
    expect(JSON.stringify(portal)).not.toContain("SECRET BRIEF");

    const admin = await (await asAdmin(t)).query(
      api.discoveryAssessments.adminGetAssessment,
      { assessmentId: id }
    );
    expect(admin?.internalBrief).toBe("SECRET BRIEF");
  });

  it("portal list is empty for another account and when signed out", async () => {
    const t = await sessionAtRecap({ confirmed: true });
    await t.withIdentity(VISITOR).mutation(api.discoveryAssessments.submit, {
      sessionId: SESSION,
      email: "v@example.com",
    });
    expect(await t.query(api.discoveryAssessments.portalListForUser, {})).toEqual([]);
    expect(
      await t.withIdentity(OTHER).query(api.discoveryAssessments.portalListForUser, {})
    ).toEqual([]);
  });

  it("admin queries require the admin role", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(VISITOR).query(api.discoveryAssessments.adminListAssessments, {})
    ).rejects.toThrow(/Unauthorized|Forbidden/);
  });
});

describe("claim", () => {
  it("rejects a signed-out caller", async () => {
    const t = await sessionAtRecap({ confirmed: true });
    await t.mutation(api.discoveryAssessments.submit, {
      sessionId: SESSION,
      email: "v@example.com",
    });
    await expect(
      t.mutation(api.discoveryAssessments.claim, { sessionId: SESSION })
    ).rejects.toThrow(/Unauthorized/);
  });

  it("binds a guest report and its lead to the identity's subject", async () => {
    const t = await sessionAtRecap({ confirmed: true });
    await t.mutation(api.discoveryAssessments.submit, {
      sessionId: SESSION,
      email: "v@example.com",
    });
    expect(
      (await t.query(api.discoveryAssessments.getBySessionId, { sessionId: SESSION }))?.claimed
    ).toBe(false);

    await t.withIdentity(VISITOR).mutation(api.discoveryAssessments.claim, {
      sessionId: SESSION,
    });

    const pub = await t.query(api.discoveryAssessments.getBySessionId, { sessionId: SESSION });
    expect(pub?.claimed).toBe(true);
    const lead = await t.query(api.leads.getLeadByEmail, { email: "v@example.com" });
    expect(lead?.clerkUserId).toBe("user_visitor");
    const portal = await t.withIdentity(VISITOR).query(
      api.discoveryAssessments.portalListForUser,
      {}
    );
    expect(portal).toHaveLength(1);
  });

  it("refuses to re-bind a report owned by another account", async () => {
    const t = await sessionAtRecap({ confirmed: true });
    await t.withIdentity(VISITOR).mutation(api.discoveryAssessments.submit, {
      sessionId: SESSION,
      email: "v@example.com",
    });
    await expect(
      t.withIdentity(OTHER).mutation(api.discoveryAssessments.claim, { sessionId: SESSION })
    ).rejects.toThrow(/another account/);
  });
});
