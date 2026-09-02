/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";
import { bookingUrlFor } from "./discoveryProcessor";

const modules = import.meta.glob("./**/*.ts");

/** requireRole("admin") needs a users row, not just the JWT: seed the owner. */
async function asAdmin(t: TestConvex<typeof schema>) {
  const owner = t.withIdentity(OWNER);
  await owner.mutation(api.users.ensureCurrentUser, {});
  return owner;
}

const SESSION = "da_proc_1";
const OWNER = {
  subject: "user_owner",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|user_owner",
  email: "matt@icodemybusiness.com",
  emailVerified: true,
};

let savedDomains: string | undefined;
let savedKey: string | undefined;
let savedResend: string | undefined;

beforeEach(() => {
  vi.useFakeTimers();
  savedDomains = process.env.OWNER_EMAIL_DOMAINS;
  savedKey = process.env.ANTHROPIC_API_KEY;
  savedResend = process.env.RESEND_API_KEY;
  process.env.OWNER_EMAIL_DOMAINS = "icodemybusiness.com";
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  process.env.RESEND_API_KEY = "re_test";
});

afterEach(() => {
  const restore = (k: string, v: string | undefined) => {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  };
  restore("OWNER_EMAIL_DOMAINS", savedDomains);
  restore("ANTHROPIC_API_KEY", savedKey);
  restore("RESEND_API_KEY", savedResend);
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/**
 * One fetch stub for both upstreams: Anthropic returns the forced tool call,
 * Resend returns an id. Records what was sent so the test can assert on it.
 */
function stubUpstreams(toolInput: unknown, opts: { anthropicStatus?: number; resendOk?: boolean } = {}) {
  const calls: { url: string; body: unknown }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, body });
      if (url.includes("anthropic")) {
        if (opts.anthropicStatus && opts.anthropicStatus >= 400) {
          return new Response("credit balance too low", { status: opts.anthropicStatus });
        }
        return new Response(
          JSON.stringify({
            content: [{ type: "tool_use", name: "write_discovery_report", input: toolInput }],
            stop_reason: "tool_use",
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }
      if (url.includes("resend")) {
        return opts.resendOk === false
          ? new Response("domain not verified", { status: 403 })
          : new Response(JSON.stringify({ id: "re_123" }), {
              status: 200,
              headers: { "content-type": "application/json" },
            });
      }
      return new Response("unexpected", { status: 500 });
    })
  );
  return calls;
}

async function submitted() {
  const t = convexTest(schema, modules);
  await t.mutation(api.agentSessions.getOrCreate, {
    sessionId: SESSION,
    agentKind: "discovery-assessment",
    source: "assessment-page",
  });
  await t.mutation(api.agentSessions.updateDiscoveryState, {
    sessionId: SESSION,
    discoveryState: {
      stage: 5,
      followUpsUsed: 0,
      answers: {
        problem: { summary: "chasing invoices", quotes: [] },
        cost: { summary: "a day a week", quotes: [] },
        history: { summary: "two years", quotes: [] },
        stakes: { summary: "can't grow", quotes: [] },
        outcome: { summary: "invoices go out alone", quotes: [] },
      },
      recapConfirmed: true,
    },
  });
  const id = await t.mutation(api.discoveryAssessments.submit, {
    sessionId: SESSION,
    email: "v@example.com",
    name: "Vee",
  });
  return { t, id };
}

const GOOD = {
  summary: {
    problem: "Invoicing is manual and lands on you.",
    impact: "About a day a week.",
    history: "Two years; a VA didn't stick.",
    stakes: "No room to take on more clients.",
    idealOutcome: "Invoices go out without you.",
    recommendedPath: "build",
    thisWeekAction: "List every invoice you touched twice last week.",
  },
  internalBrief: "## Fit\nGood. ## Urgency\nHigh.",
};

describe("finalizeAssessment", () => {
  it("stores the model's summary and brief, then sends and audits the email", async () => {
    const { t, id } = await submitted();
    const calls = stubUpstreams(GOOD);
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const admin = await (await asAdmin(t)).query(
      api.discoveryAssessments.adminGetAssessment,
      { assessmentId: id }
    );
    expect(admin?.status).toBe("ready");
    expect(admin?.summary).toEqual(GOOD.summary);
    expect(admin?.internalBrief).toBe(GOOD.internalBrief);
    expect(admin?.processingError).toBeUndefined();
    expect(admin?.emailSent).toBe(true);

    const anthropic = calls.find((c) => c.url.includes("anthropic"))!.body as {
      tool_choice: { name: string };
      system: string;
    };
    expect(anthropic.tool_choice.name).toBe("write_discovery_report");
    expect(anthropic.system).toMatch(/Never mention, quote, or estimate a price/);

    const resend = calls.find((c) => c.url.includes("resend"))!.body as {
      to: string;
      subject: string;
      html: string;
    };
    expect(resend.to).toBe("v@example.com");
    expect(resend.subject).toMatch(/discovery assessment/);
    expect(resend.html).toContain("Invoicing is manual");
    expect(resend.html).toContain("/book?session=da_proc_1&email=v%40example.com&name=Vee");
    expect(resend.html).not.toMatch(/\$\d/);

    const sends = await t.query(api.emailSends.listForEmail, { email: "v@example.com" });
    expect(sends).toHaveLength(1);
    expect(sends[0]).toMatchObject({
      template: "discovery-report",
      status: "sent",
      resendId: "re_123",
    });
  });

  it("repairs an unknown path to diagnostic and records why", async () => {
    const { t, id } = await submitted();
    stubUpstreams({
      ...GOOD,
      summary: { ...GOOD.summary, recommendedPath: "moonshot" },
    });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const admin = await (await asAdmin(t)).query(
      api.discoveryAssessments.adminGetAssessment,
      { assessmentId: id }
    );
    expect(admin?.summary?.recommendedPath).toBe("diagnostic");
    expect(admin?.processingError).toMatch(/unknown path/);
  });

  it("still reaches ready with a verbatim summary when the model is down", async () => {
    const { t, id } = await submitted();
    const calls = stubUpstreams(GOOD, { anthropicStatus: 402 });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const admin = await (await asAdmin(t)).query(
      api.discoveryAssessments.adminGetAssessment,
      { assessmentId: id }
    );
    expect(admin?.status).toBe("ready");
    expect(admin?.summary?.problem).toBe("chasing invoices");
    expect(admin?.summary?.recommendedPath).toBe("diagnostic");
    expect(admin?.internalBrief).toMatch(/Auto-draft unavailable/);
    expect(admin?.processingError).toMatch(/drafting unavailable/);
    // The email still goes, and says what it is.
    expect(admin?.emailSent).toBe(true);
    const resend = calls.find((c) => c.url.includes("resend"))!.body as { html: string };
    expect(resend.html).toContain("exactly as you gave them");
  });

  it("records a failed send without marking the email sent", async () => {
    const { t, id } = await submitted();
    stubUpstreams(GOOD, { resendOk: false });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const admin = await (await asAdmin(t)).query(
      api.discoveryAssessments.adminGetAssessment,
      { assessmentId: id }
    );
    expect(admin?.status).toBe("ready");
    expect(admin?.emailSent).toBe(false);
    expect(admin?.processingError).toMatch(/Report email failed/);
    const sends = await t.query(api.emailSends.listForEmail, { email: "v@example.com" });
    expect(sends[0]).toMatchObject({ status: "failed", template: "discovery-report" });
  });
});

describe("bookingUrlFor", () => {
  it("carries session, email and name as query params", () => {
    const url = new URL(bookingUrlFor("da_x", "a@b.co", "Ann"));
    expect(url.pathname).toBe("/book");
    expect(url.searchParams.get("session")).toBe("da_x");
    expect(url.searchParams.get("email")).toBe("a@b.co");
    expect(url.searchParams.get("name")).toBe("Ann");
  });
});
