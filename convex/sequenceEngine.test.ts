/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import {
  createUnsubscribeToken,
  verifyUnsubscribeToken,
} from "./lib/unsubscribeToken";
import { TRACKS } from "./lib/sequenceTracks";

const modules = import.meta.glob("./**/*.ts");

const SECRET = "test-unsubscribe-secret";

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-04T09:00:00Z"));
  saved = {
    UNSUBSCRIBE_SECRET: process.env.UNSUBSCRIBE_SECRET,
    MAILING_ADDRESS: process.env.MAILING_ADDRESS,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
  };
  process.env.UNSUBSCRIBE_SECRET = SECRET;
  process.env.MAILING_ADDRESS = "1 Test Street, Testville";
  process.env.RESEND_API_KEY = "re_test";
  process.env.CONVEX_SITE_URL = "https://example.convex.site";
});

afterEach(() => {
  for (const [k, val] of Object.entries(saved)) {
    if (val === undefined) delete process.env[k];
    else process.env[k] = val;
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

/** A lead who has consented — the only kind that can be enrolled. */
async function consentedLead(t: TestConvex<typeof schema>, email: string) {
  const leadId = await t.mutation(api.leads.createLead, {
    email,
    source: "test",
    sessionId: "s1",
  });
  await t.run(async (ctx) => {
    await ctx.db.patch(leadId, {
      consentedAt: Date.now(),
      consentSource: "test",
    });
    // Sequences ship paused; unpause for the tests that expect sends.
    const existing = await ctx.db
      .query("ownerSettings")
      .withIndex("by_key", (q) => q.eq("key", "owner"))
      .first();
    if (existing) await ctx.db.patch(existing._id, { sequencesPaused: false });
    else
      await ctx.db.insert("ownerSettings", {
        key: "owner",
        overheadWeeklyBudgetHours: 0,
        sequencesPaused: false,
        updatedAt: Date.now(),
      });
  });
  return leadId;
}

/**
 * Every step ships unauthored (subject: null) until Matthew answers the story
 * intake, and `claimStep` refuses to send unauthored copy. These tests are
 * about the ENGINE, so author one step in place for the duration.
 */
function authorFirstStep(subject = "Test subject") {
  const step = TRACKS["free-tools"].steps[0];
  const original = step.subject;
  step.subject = subject;
  return () => {
    step.subject = original;
  };
}

function stubResend(status = 200, id = "re_seq_1") {
  const fetchMock = vi.fn(async () =>
    status >= 400
      ? new Response("boom", { status })
      : new Response(JSON.stringify({ id }), { status })
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function enrollDue(t: TestConvex<typeof schema>, email: string) {
  const res = await t.mutation(internal.emailSequences.enroll, {
    email,
    track: "free-tools",
    // Due immediately so a sweep picks it up without advancing the clock.
    startAt: Date.now() - 1000,
  });
  return res;
}

describe("enrollment clamp", () => {
  it("refuses an address with no consent record, creating nothing", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.leads.createLead, { email: "noconsent@example.com", source: "test" });

    const res = await t.mutation(internal.emailSequences.enroll, {
      email: "noconsent@example.com",
      track: "free-tools",
    });

    expect(res).toEqual({ status: "refused", reason: "no-consent" });
    const rows = await t.run((ctx) => ctx.db.query("sequenceEnrollments").collect());
    expect(rows).toHaveLength(0);
  });

  it("refuses a suppressed address, creating nothing", async () => {
    const t = convexTest(schema, modules);
    await consentedLead(t, "gone@example.com");
    await t.mutation(internal.emailSuppressions.suppress, {
      email: "gone@example.com",
      reason: "unsubscribe",
      scope: "marketing",
    });

    const res = await t.mutation(internal.emailSequences.enroll, {
      email: "gone@example.com",
      track: "free-tools",
    });

    expect(res).toEqual({ status: "refused", reason: "suppressed" });
    const rows = await t.run((ctx) => ctx.db.query("sequenceEnrollments").collect());
    expect(rows).toHaveLength(0);
  });

  it("is idempotent per track and never rewinds to day one", async () => {
    const t = convexTest(schema, modules);
    await consentedLead(t, "dupe@example.com");

    const first = await enrollDue(t, "dupe@example.com");
    expect(first.status).toBe("enrolled");

    await t.run(async (ctx) => {
      const row = await ctx.db.query("sequenceEnrollments").first();
      await ctx.db.patch(row!._id, { lastStepSent: 2, nextStepIndex: 2 });
    });

    const second = await enrollDue(t, "dupe@example.com");
    expect(second.status).toBe("already-enrolled");

    const rows = await t.run((ctx) => ctx.db.query("sequenceEnrollments").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].lastStepSent).toBe(2);
  });

  it("supersedes a lower-priority track and queues behind a higher one", async () => {
    const t = convexTest(schema, modules);
    await consentedLead(t, "ladder@example.com");

    await t.mutation(internal.emailSequences.enroll, {
      email: "ladder@example.com",
      track: "free-tools",
    });
    const up = await t.mutation(internal.emailSequences.enroll, {
      email: "ladder@example.com",
      track: "assessment",
    });
    expect(up.status).toBe("enrolled");

    let rows = await t.run((ctx) => ctx.db.query("sequenceEnrollments").collect());
    const freeTools = rows.find((r) => r.track === "free-tools")!;
    expect(freeTools.status).toBe("exited");
    expect(freeTools.exitReason).toBe("superseded");
    expect(rows.filter((r) => r.status === "active")).toHaveLength(1);

    // A lower-priority track arriving later must not displace the incumbent.
    const down = await t.mutation(internal.emailSequences.enroll, {
      email: "ladder@example.com",
      track: "academy",
    });
    expect(down.status).toBe("queued-behind");

    rows = await t.run((ctx) => ctx.db.query("sequenceEnrollments").collect());
    expect(rows.find((r) => r.track === "assessment")!.status).toBe("active");
    expect(rows.find((r) => r.track === "academy")!.status).toBe("paused");
    expect(rows.filter((r) => r.status === "active")).toHaveLength(1);
  });
});

describe("idempotent sending", () => {
  it("sends a step exactly once when swept twice without advancing the clock", async () => {
    const restore = authorFirstStep();
    try {
      const t = convexTest(schema, modules);
      await consentedLead(t, "once@example.com");
      const fetchMock = stubResend();
      await enrollDue(t, "once@example.com");

      await t.mutation(internal.sequenceEngine.sweep, {});
      await t.finishAllScheduledFunctions(vi.runAllTimers);
      await t.mutation(internal.sequenceEngine.sweep, {});
      await t.finishAllScheduledFunctions(vi.runAllTimers);

      expect(fetchMock).toHaveBeenCalledTimes(1);

      const ledger = await t.run((ctx) =>
        ctx.db.query("sequenceStepSends").collect()
      );
      expect(ledger).toHaveLength(1);
      expect(ledger[0].state).toBe("sent");
    } finally {
      restore();
    }
  });

  it("sends once under a concurrent double fan-out", async () => {
    const restore = authorFirstStep();
    try {
      const t = convexTest(schema, modules);
      await consentedLead(t, "race@example.com");
      const fetchMock = stubResend();
      await enrollDue(t, "race@example.com");

      const row = await t.run((ctx) => ctx.db.query("sequenceEnrollments").first());
      await Promise.all([
        t.action(internal.sequenceEngine.deliverStep, { enrollmentId: row!._id }),
        t.action(internal.sequenceEngine.deliverStep, { enrollmentId: row!._id }),
      ]);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const ledger = await t.run((ctx) =>
        ctx.db.query("sequenceStepSends").collect()
      );
      expect(ledger).toHaveLength(1);
    } finally {
      restore();
    }
  });

  it("records every sequence send to emailSends", async () => {
    const restore = authorFirstStep("Audited subject");
    try {
      const t = convexTest(schema, modules);
      await consentedLead(t, "audit@example.com");
      stubResend(200, "re_audited");
      await enrollDue(t, "audit@example.com");

      await t.mutation(internal.sequenceEngine.sweep, {});
      await t.finishAllScheduledFunctions(vi.runAllTimers);

      const sends = await t.run((ctx) => ctx.db.query("emailSends").collect());
      expect(sends).toHaveLength(1);
      expect(sends[0]).toMatchObject({
        to: "audit@example.com",
        template: "seq:free-tools:d1",
        subject: "Audited subject",
        status: "sent",
        resendId: "re_audited",
      });
      expect(sends[0].leadId).toBeDefined();
    } finally {
      restore();
    }
  });

  it("carries the one-click unsubscribe headers and the postal address", async () => {
    const restore = authorFirstStep();
    try {
      const t = convexTest(schema, modules);
      await consentedLead(t, "headers@example.com");
      const fetchMock = stubResend();
      await enrollDue(t, "headers@example.com");

      await t.mutation(internal.sequenceEngine.sweep, {});
      await t.finishAllScheduledFunctions(vi.runAllTimers);

      const call = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      const body = JSON.parse(String(call[1].body));
      const reqHeaders = call[1].headers as Record<string, string>;

      expect(body.headers["List-Unsubscribe"]).toMatch(
        /^<https:\/\/example\.convex\.site\/unsubscribe\?t=.+>$/
      );
      expect(body.headers["List-Unsubscribe-Post"]).toBe(
        "List-Unsubscribe=One-Click"
      );
      expect(body.html).toContain("1 Test Street, Testville");

      const ledger = await t.run((ctx) =>
        ctx.db.query("sequenceStepSends").first()
      );
      expect(reqHeaders["Idempotency-Key"]).toBe(ledger!.dedupeKey);
    } finally {
      restore();
    }
  });
});

describe("the send gate", () => {
  it("never sends to a suppressed address and leaves no ledger row", async () => {
    const restore = authorFirstStep();
    try {
      const t = convexTest(schema, modules);
      await consentedLead(t, "blocked@example.com");
      await enrollDue(t, "blocked@example.com");

      // Suppress after enrolling — mid-sequence, the realistic case.
      await t.mutation(internal.emailSuppressions.suppress, {
        email: "blocked@example.com",
        reason: "hard_bounce",
        scope: "all",
      });

      const fetchMock = stubResend();
      await t.mutation(internal.sequenceEngine.sweep, {});
      await t.finishAllScheduledFunctions(vi.runAllTimers);

      expect(fetchMock).not.toHaveBeenCalled();
      // No ledger row proves the gate ran BEFORE the claim write.
      const ledger = await t.run((ctx) =>
        ctx.db.query("sequenceStepSends").collect()
      );
      expect(ledger).toHaveLength(0);

      const row = await t.run((ctx) => ctx.db.query("sequenceEnrollments").first());
      expect(row!.status).toBe("exited");
    } finally {
      restore();
    }
  });

  it("sends nothing at all while sequences are paused", async () => {
    const restore = authorFirstStep();
    try {
      const t = convexTest(schema, modules);
      await consentedLead(t, "paused@example.com");
      await enrollDue(t, "paused@example.com");
      await t.run(async (ctx) => {
        const s = await ctx.db
          .query("ownerSettings")
          .withIndex("by_key", (q) => q.eq("key", "owner"))
          .first();
        await ctx.db.patch(s!._id, { sequencesPaused: true });
      });

      const fetchMock = stubResend();
      await t.mutation(internal.sequenceEngine.sweep, {});
      await t.finishAllScheduledFunctions(vi.runAllTimers);

      expect(fetchMock).not.toHaveBeenCalled();
      // Paused is not exited — it must resume when unpaused.
      const row = await t.run((ctx) => ctx.db.query("sequenceEnrollments").first());
      expect(row!.status).toBe("active");
    } finally {
      restore();
    }
  });

  it("refuses to send a step whose copy has not been authored", async () => {
    const t = convexTest(schema, modules);
    await consentedLead(t, "unauthored@example.com");
    const fetchMock = stubResend();
    await enrollDue(t, "unauthored@example.com");

    // No authorFirstStep() here: every step ships with subject === null.
    await t.mutation(internal.sequenceEngine.sweep, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(fetchMock).not.toHaveBeenCalled();
    const ledger = await t.run((ctx) =>
      ctx.db.query("sequenceStepSends").collect()
    );
    expect(ledger).toHaveLength(0);
  });
});

describe("failure handling", () => {
  it("records a failed send, keeps the step, and retries it later", async () => {
    const restore = authorFirstStep();
    try {
      const t = convexTest(schema, modules);
      await consentedLead(t, "flaky@example.com");
      stubResend(500);
      await enrollDue(t, "flaky@example.com");

      await t.mutation(internal.sequenceEngine.sweep, {});
      await t.finishAllScheduledFunctions(vi.runAllTimers);

      const sends = await t.run((ctx) => ctx.db.query("emailSends").collect());
      expect(sends[0]).toMatchObject({ status: "failed" });

      const row = await t.run((ctx) => ctx.db.query("sequenceEnrollments").first());
      expect(row!.failureCount).toBe(1);
      // The cursor rolled back, so the same step is tried again.
      expect(row!.nextStepIndex).toBe(0);
      expect(row!.nextDueAt).toBeGreaterThan(Date.now());
      expect(row!.status).toBe("active");
    } finally {
      restore();
    }
  });

  it("gives up on a permanently rejected address", async () => {
    const restore = authorFirstStep();
    try {
      const t = convexTest(schema, modules);
      await consentedLead(t, "bad@example.com");
      stubResend(422);
      await enrollDue(t, "bad@example.com");

      await t.mutation(internal.sequenceEngine.sweep, {});
      await t.finishAllScheduledFunctions(vi.runAllTimers);

      const row = await t.run((ctx) => ctx.db.query("sequenceEnrollments").first());
      expect(row!.status).toBe("exited");
      expect(row!.exitReason).toBe("send-failed-permanently");
    } finally {
      restore();
    }
  });
});

describe("unsubscribe token", () => {
  it("round-trips and rejects tampering, a wrong secret, and garbage", async () => {
    const token = await createUnsubscribeToken("person@example.com", SECRET);
    expect(await verifyUnsubscribeToken(token, SECRET)).toBe("person@example.com");

    const [payload, sig] = token.split(".");
    const tampered = `${payload}x.${sig}`;
    expect(await verifyUnsubscribeToken(tampered, SECRET)).toBeNull();
    expect(await verifyUnsubscribeToken(token, "another-secret")).toBeNull();
    expect(await verifyUnsubscribeToken("not-a-token", SECRET)).toBeNull();
    expect(await verifyUnsubscribeToken("", SECRET)).toBeNull();
  });

  it("suppresses and exits every track on one-click POST", async () => {
    const t = convexTest(schema, modules);
    await consentedLead(t, "leaving@example.com");
    await enrollDue(t, "leaving@example.com");

    const token = await createUnsubscribeToken("leaving@example.com", SECRET);
    const res = await t.fetch(`/unsubscribe?t=${encodeURIComponent(token)}`, {
      method: "POST",
    });
    expect(res.status).toBe(200);

    const suppressions = await t.run((ctx) =>
      ctx.db.query("emailSuppressions").collect()
    );
    expect(suppressions).toHaveLength(1);
    expect(suppressions[0]).toMatchObject({
      email: "leaving@example.com",
      reason: "unsubscribe",
      scope: "marketing",
    });

    const row = await t.run((ctx) => ctx.db.query("sequenceEnrollments").first());
    expect(row!.status).toBe("exited");
    expect(row!.exitReason).toBe("unsubscribed");
  });

  it("suppresses nothing when the token does not verify", async () => {
    const t = convexTest(schema, modules);
    await consentedLead(t, "safe@example.com");

    const res = await t.fetch("/unsubscribe?t=forged.token", { method: "POST" });
    expect(res.status).toBe(200); // one-click always 200s; the effect is what matters

    const suppressions = await t.run((ctx) =>
      ctx.db.query("emailSuppressions").collect()
    );
    expect(suppressions).toHaveLength(0);
  });

  it("is idempotent — a link prefetcher hitting it twice is harmless", async () => {
    const t = convexTest(schema, modules);
    await consentedLead(t, "twice@example.com");
    const token = await createUnsubscribeToken("twice@example.com", SECRET);
    const url = `/unsubscribe?t=${encodeURIComponent(token)}`;

    await t.fetch(url, { method: "GET" });
    await t.fetch(url, { method: "GET" });

    const suppressions = await t.run((ctx) =>
      ctx.db.query("emailSuppressions").collect()
    );
    expect(suppressions).toHaveLength(1);
  });
});
