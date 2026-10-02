/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

// Owner-gated count queries the /funnel-analysis skill reads:
// emailSends.adminCounts and leads.adminCounts.

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

let savedDomains: string | undefined;
beforeEach(() => {
  // createLead schedules mango.pushLead; fake the timers so it never fires after the test.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  savedDomains = process.env.OWNER_EMAIL_DOMAINS;
  process.env.OWNER_EMAIL_DOMAINS = "icodemybusiness.com";
});
afterEach(() => {
  if (savedDomains === undefined) delete process.env.OWNER_EMAIL_DOMAINS;
  else process.env.OWNER_EMAIL_DOMAINS = savedDomains;
  vi.useRealTimers();
});

const DAY = 86_400_000;

const lead = (email: string, source: string, sessionId: string) => ({ email, source, sessionId });

describe("emailSends.adminCounts", () => {
  it("refuses anonymous and non-owner callers", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.emailSends.adminCounts, {})).rejects.toThrow("Unauthorized");
    await expect(t.withIdentity(OUTSIDER).query(api.emailSends.adminCounts, {})).rejects.toThrow("Forbidden");
  });

  it("splits sent/failed by template inside the window", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.leads.createLead, lead("a@example.com", "free-tools", "s1"));
    await t.mutation(api.leads.createLead, lead("b@example.com", "free-tools", "s2"));
    await t.mutation(api.emailSends.record, { to: "a@example.com", template: "welcome", subject: "W", status: "sent", resendId: "re_a" });
    await t.mutation(api.emailSends.record, { to: "b@example.com", template: "welcome", subject: "W", status: "failed", error: "boom" });
    await t.mutation(api.emailSends.record, { to: "a@example.com", template: "discovery-report", subject: "R", status: "sent", resendId: "re_r" });
    // An old row, outside a 7-day window.
    await t.run(async (ctx) => {
      await ctx.db.insert("emailSends", { to: "a@example.com", template: "welcome", subject: "W", status: "sent", createdAt: Date.now() - 30 * DAY });
    });

    const c = await t.withIdentity(OWNER).query(api.emailSends.adminCounts, { windowDays: 7 });
    expect(c.total).toBe(3);
    expect(c.sent).toBe(2);
    expect(c.failed).toBe(1);
    expect(c.byTemplate).toEqual({ welcome: { sent: 1, failed: 1 }, "discovery-report": { sent: 1, failed: 0 } });
    expect(c.truncated).toBe(false);

    const wide = await t.withIdentity(OWNER).query(api.emailSends.adminCounts, { windowDays: 60 });
    expect(wide.total).toBe(4);
  });
});

describe("leads.adminCounts", () => {
  it("refuses anonymous and non-owner callers", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.leads.adminCounts, {})).rejects.toThrow("Unauthorized");
    await expect(t.withIdentity(OUTSIDER).query(api.leads.adminCounts, {})).rejects.toThrow("Forbidden");
  });

  it("counts leads by source and welcomed leads inside the window", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.leads.createLead, lead("a@example.com", "free-tools", "s1"));
    await t.mutation(api.leads.createLead, lead("b@example.com", "assessment", "s2"));
    await t.mutation(api.leads.createLead, lead("c@example.com", "free-tools", "s3"));
    await t.mutation(api.emailSends.record, { to: "a@example.com", template: "welcome", subject: "W", status: "sent", resendId: "re_a" });
    await t.run(async (ctx) => {
      await ctx.db.insert("leads", { email: "old@example.com", source: "free-tools", score: 0, createdAt: Date.now() - 40 * DAY });
    });

    const c = await t.withIdentity(OWNER).query(api.leads.adminCounts, { windowDays: 7 });
    expect(c.total).toBe(3);
    expect(c.bySource).toEqual({ "free-tools": 2, assessment: 1 });
    expect(c.withWelcomeEmail).toBe(1);

    const wide = await t.withIdentity(OWNER).query(api.leads.adminCounts, { windowDays: 90 });
    expect(wide.total).toBe(4);
  });
});
