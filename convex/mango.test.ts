/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { pacificOffsetHours, saturdayWeekStart } from "./mango";

const modules = import.meta.glob("./**/*.ts");

const HOUR = 3_600_000;
const ENV_KEYS = ["MANGO_MCP_TOKEN", "MANGO_MCP_URL", "ANTHROPIC_API_KEY"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  vi.useFakeTimers();
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  process.env.MANGO_MCP_TOKEN = "mps_test";
  process.env.MANGO_MCP_URL = "https://mango.example/mcp";
  // Background processors scheduled by the insert paths take their no-key path.
  delete process.env.ANTHROPIC_API_KEY;
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

type ToolCall = { name: string; arguments: Record<string, unknown> };

/**
 * Mango MCP stub: answers the handshake, records each tools/call, and replies
 * with `toolResult` (or an MCP error result when `fail` is set). Any other URL
 * gets an empty 200 so unrelated background work never hits the network.
 */
function stubMango(options: { fail?: boolean; toolResult?: unknown } = {}) {
  const toolCalls: ToolCall[] = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    if (!String(url).startsWith("https://mango.example/")) {
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    }
    const payload = JSON.parse(String(init.body)) as {
      id?: number;
      method: string;
      params?: ToolCall;
    };
    if (payload.method === "notifications/initialized") return new Response(null, { status: 202 });
    let result: unknown = { protocolVersion: "2025-06-18" };
    if (payload.method === "tools/call") {
      toolCalls.push(payload.params!);
      result = options.fail
        ? { isError: true, content: [{ type: "text", text: "boom" }] }
        : { structuredContent: options.toolResult ?? { ok: true } };
    }
    return new Response(JSON.stringify({ jsonrpc: "2.0", id: payload.id, result }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { toolCalls, fetchMock };
}

async function scheduledLeadPushes(t: TestConvex<typeof schema>) {
  return await t.run(async (ctx) => {
    const jobs = await ctx.db.system.query("_scheduled_functions").collect();
    return jobs
      .filter((job) => /pushLead/.test(job.name))
      .map((job) => (job.args[0] as { leadId: Id<"leads"> }).leadId);
  });
}

describe("pushLead is scheduled once per NEW lead, never on the dedupe path", () => {
  it("leads.createLead", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(api.leads.createLead, { email: "a@example.com", source: "homepage" });
    const again = await t.mutation(api.leads.createLead, { email: "a@example.com", sessionId: "s2" });
    expect(again).toBe(first);
    expect(await scheduledLeadPushes(t)).toEqual([first]);
  });

  it("applications.submitApplication", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.applications.submitApplication, { email: "b@example.com" });
    await t.mutation(api.applications.submitApplication, { email: "b@example.com", name: "Bee" });
    const lead = await t.query(api.leads.getLeadByEmail, { email: "b@example.com" });
    expect(await scheduledLeadPushes(t)).toEqual([lead!._id]);
  });

  it("conversations (Retell call outcome)", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.conversations.updateConversationOutcome, {
      retellCallId: "call_1",
      visitorEmail: "c@example.com",
    });
    await t.mutation(internal.conversations.updateConversationOutcome, {
      retellCallId: "call_2",
      visitorEmail: "c@example.com",
    });
    const lead = await t.query(api.leads.getLeadByEmail, { email: "c@example.com" });
    expect(await scheduledLeadPushes(t)).toEqual([lead!._id]);
  });

  it("discoveryAssessments.submit, and not for an email already on file", async () => {
    const t = convexTest(schema, modules);
    const atRecap = async (sessionId: string) => {
      await t.mutation(api.agentSessions.getOrCreate, {
        sessionId,
        agentKind: "discovery-assessment",
        source: "homepage",
      });
      await t.mutation(api.agentSessions.updateDiscoveryState, {
        sessionId,
        discoveryState: { stage: 5, followUpsUsed: 0, answers: {}, recapConfirmed: true },
      });
    };
    await atRecap("da_1");
    await t.mutation(api.discoveryAssessments.submit, { sessionId: "da_1", email: "d@example.com" });
    await atRecap("da_2");
    await t.mutation(api.discoveryAssessments.submit, { sessionId: "da_2", email: "d@example.com" });
    const lead = await t.query(api.leads.getLeadByEmail, { email: "d@example.com" });
    expect(await scheduledLeadPushes(t)).toEqual([lead!._id]);
  });
});

describe("pushLead", () => {
  it("sends the lead to icmb_lead_ingest as a site lead, once, end to end", async () => {
    const { toolCalls } = stubMango({
      toolResult: { lead_id: "L1", clickup_task_id: "T1", created: true },
    });
    const t = convexTest(schema, modules);
    vi.setSystemTime(Date.UTC(2026, 8, 24, 17, 0));
    const leadId = await t.mutation(api.leads.createLead, {
      email: "e@example.com",
      name: "Ee",
      source: "homepage",
      variant: "b",
    });
    await t.mutation(api.leads.createLead, { email: "e@example.com" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    expect(toolCalls).toEqual([
      {
        name: "icmb_lead_ingest",
        arguments: {
          email: "e@example.com",
          name: "Ee",
          source: "site",
          external_id: leadId,
          created_at: "2026-09-24T17:00:00.000Z",
          summary: "source: homepage · variant: b",
        },
      },
    ]);
    const writes = await t.run((ctx) => ctx.db.query("mangoWrites").collect());
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ tool: "icmb_lead_ingest", ok: true });
    // The audit row names the lead by id; the email is not copied into it.
    expect(JSON.stringify(writes[0].args)).not.toContain("e@example.com");
  });

  it("omits name and summary when the lead has neither", async () => {
    const { toolCalls } = stubMango();
    const t = convexTest(schema, modules);
    const leadId = await t.run((ctx) =>
      ctx.db.insert("leads", { email: "f@example.com", score: 0, createdAt: 0 }),
    );
    await t.action(internal.mango.pushLead, { leadId });
    expect(toolCalls[0].arguments).toEqual({
      email: "f@example.com",
      source: "site",
      external_id: leadId,
      created_at: "1970-01-01T00:00:00.000Z",
    });
  });

  it("skips without calling Mango when MANGO_MCP_TOKEN is unset", async () => {
    delete process.env.MANGO_MCP_TOKEN;
    const { fetchMock } = stubMango();
    const t = convexTest(schema, modules);
    const leadId = await t.run((ctx) =>
      ctx.db.insert("leads", { email: "g@example.com", score: 0, createdAt: 0 }),
    );
    expect(await t.action(internal.mango.pushLead, { leadId })).toEqual({ skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records a Mango failure instead of throwing", async () => {
    stubMango({ fail: true });
    const t = convexTest(schema, modules);
    const leadId = await t.run((ctx) =>
      ctx.db.insert("leads", { email: "h@example.com", score: 0, createdAt: 0 }),
    );
    expect(await t.action(internal.mango.pushLead, { leadId })).toEqual({
      skipped: false,
      ok: false,
    });
    const writes = await t.run((ctx) => ctx.db.query("mangoWrites").collect());
    expect(writes[0]).toMatchObject({ tool: "icmb_lead_ingest", ok: false });
    expect(writes[0].error).toContain("boom");
  });
});

describe("pacificOffsetHours", () => {
  it("switches at 02:00 local on the US DST dates", () => {
    // 2026: PDT starts Sun 8 Mar 10:00 UTC, ends Sun 1 Nov 09:00 UTC.
    expect(pacificOffsetHours(Date.UTC(2026, 2, 8, 10) - 1)).toBe(-8);
    expect(pacificOffsetHours(Date.UTC(2026, 2, 8, 10))).toBe(-7);
    expect(pacificOffsetHours(Date.UTC(2026, 10, 1, 9) - 1)).toBe(-7);
    expect(pacificOffsetHours(Date.UTC(2026, 10, 1, 9))).toBe(-8);
  });
});

describe("saturdayWeekStart", () => {
  it("run by the cron (Sat 13:30 UTC, PDT) → the Sat–Fri week that ended last night", () => {
    expect(saturdayWeekStart(Date.UTC(2026, 8, 26, 13, 30))).toEqual({
      weekStart: "2026-09-19",
      startMs: Date.UTC(2026, 8, 19, 7),
      endMs: Date.UTC(2026, 8, 26, 7),
    });
  });

  it("uses the Pacific date, not the UTC date (Fri 23:30 PDT is already Saturday in UTC)", () => {
    expect(saturdayWeekStart(Date.UTC(2026, 8, 26, 6, 30)).weekStart).toBe("2026-09-12");
  });

  it("run mid-week → the last complete week", () => {
    // Wed 30 Sep 2026, noon PDT.
    expect(saturdayWeekStart(Date.UTC(2026, 8, 30, 19)).weekStart).toBe("2026-09-19");
  });

  it("a week containing the spring-forward switch is 167 hours", () => {
    // Sat 20 Mar 2027 13:30 UTC (06:30 PDT); PDT began Sun 14 Mar 2027.
    const w = saturdayWeekStart(Date.UTC(2027, 2, 20, 13, 30));
    expect(w.weekStart).toBe("2027-03-13");
    expect(w.startMs).toBe(Date.UTC(2027, 2, 13, 8)); // 00:00 PST
    expect(w.endMs).toBe(Date.UTC(2027, 2, 20, 7)); // 00:00 PDT
    expect((w.endMs - w.startMs) / HOUR).toBe(167);
  });

  it("a week containing the fall-back switch is 169 hours", () => {
    // Sat 7 Nov 2026 13:30 UTC (05:30 PST); PDT ended Sun 1 Nov 2026.
    const w = saturdayWeekStart(Date.UTC(2026, 10, 7, 13, 30));
    expect(w.weekStart).toBe("2026-10-31");
    expect(w.startMs).toBe(Date.UTC(2026, 9, 31, 7)); // 00:00 PDT
    expect(w.endMs).toBe(Date.UTC(2026, 10, 7, 8)); // 00:00 PST
    expect((w.endMs - w.startMs) / HOUR).toBe(169);
  });

  it("the cron time is after Fri 23:59 PT and before 07:00 PT in both PDT and PST", () => {
    for (const cronRun of [Date.UTC(2026, 8, 26, 13, 30), Date.UTC(2026, 11, 5, 13, 30)]) {
      const w = saturdayWeekStart(cronRun);
      expect(cronRun).toBeGreaterThanOrEqual(w.endMs);
      expect(cronRun).toBeLessThan(w.endMs + 7 * HOUR);
    }
  });
});

describe("pushFunnelWeek", () => {
  it("sends the week's new site-lead count and the 7-day funnel to record_icmb_funnel_week", async () => {
    const { toolCalls } = stubMango();
    const t = convexTest(schema, modules);
    // Inserted in time order: the fake DB's _creationTime is monotonic.
    const insertAt = async (ms: number, email: string) => {
      vi.setSystemTime(ms);
      await t.run((ctx) => ctx.db.insert("leads", { email, score: 0, createdAt: ms }));
    };
    await insertAt(Date.UTC(2026, 8, 19, 7) - 1, "before@example.com"); // Fri 23:59:59 PDT, prior week
    await insertAt(Date.UTC(2026, 8, 19, 7), "start@example.com"); // Sat 00:00 PDT, counted
    await insertAt(Date.UTC(2026, 8, 26, 7) - 1, "end@example.com"); // Fri 23:59:59 PDT, counted
    await insertAt(Date.UTC(2026, 8, 26, 7), "after@example.com"); // Sat 00:00 PDT, next week

    vi.setSystemTime(Date.UTC(2026, 8, 26, 13, 30)); // the cron's slot
    const result = await t.action(internal.mango.pushFunnelWeek, {});
    expect(result).toEqual({ skipped: false, ok: true, weekStart: "2026-09-19", truncated: false });

    const funnel = await t.query(internal.funnelConstraint.internalFunnelConstraint, {
      windowDays: 7,
    });
    expect(toolCalls).toEqual([
      {
        name: "record_icmb_funnel_week",
        arguments: { week_start: "2026-09-19", window_days: 7, site_leads_new: 2, funnel },
      },
    ]);
    expect(funnel.window.days).toBe(7);
    const writes = await t.run((ctx) => ctx.db.query("mangoWrites").collect());
    expect(writes[0]).toMatchObject({ tool: "record_icmb_funnel_week", ok: true });
  });

  it("skips without calling Mango when MANGO_MCP_TOKEN is unset", async () => {
    delete process.env.MANGO_MCP_TOKEN;
    const { fetchMock } = stubMango();
    const t = convexTest(schema, modules);
    expect(await t.action(internal.mango.pushFunnelWeek, {})).toEqual({ skipped: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("records a Mango failure instead of throwing", async () => {
    stubMango({ fail: true });
    const t = convexTest(schema, modules);
    vi.setSystemTime(Date.UTC(2026, 8, 26, 13, 30));
    const result = await t.action(internal.mango.pushFunnelWeek, {});
    expect(result).toMatchObject({ skipped: false, ok: false, weekStart: "2026-09-19" });
    const writes = await t.run((ctx) => ctx.db.query("mangoWrites").collect());
    expect(writes[0]).toMatchObject({ tool: "record_icmb_funnel_week", ok: false });
  });
});
