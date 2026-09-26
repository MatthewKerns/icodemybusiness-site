/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import { api, internal } from "./_generated/api";
import schema from "./schema";

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
  savedDomains = process.env.OWNER_EMAIL_DOMAINS;
  process.env.OWNER_EMAIL_DOMAINS = "icodemybusiness.com";
});
afterEach(() => {
  if (savedDomains === undefined) delete process.env.OWNER_EMAIL_DOMAINS;
  else process.env.OWNER_EMAIL_DOMAINS = savedDomains;
});

const DAY = 86_400_000;
const opened = (resendId: string, email: string, occurredAt: number) => ({
  resendId,
  type: "email.opened",
  email,
  occurredAt,
});

describe("emailEvents.record", () => {
  it("stores an event", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(internal.emailEvents.record, opened("re_1", "a@example.com", 1000));
    expect(id).not.toBeNull();
  });

  it("is idempotent on (resendId, type, occurredAt) — Svix redeliveries do not double count", async () => {
    const t = convexTest(schema, modules);
    const first = await t.mutation(internal.emailEvents.record, opened("re_1", "a@example.com", 1000));
    const again = await t.mutation(internal.emailEvents.record, opened("re_1", "a@example.com", 1000));
    expect(first).not.toBeNull();
    expect(again).toBeNull();
    const counts = await t.withIdentity(OWNER).query(api.emailEvents.adminCounts, {});
    expect(counts.total).toBe(1);
  });

  it("keeps distinct events for the same send (delivered, then opened twice at different times)", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.emailEvents.record, { resendId: "re_1", type: "email.delivered", email: "a@example.com", occurredAt: 900 });
    await t.mutation(internal.emailEvents.record, opened("re_1", "a@example.com", 1000));
    await t.mutation(internal.emailEvents.record, opened("re_1", "a@example.com", 2000));
    const counts = await t.withIdentity(OWNER).query(api.emailEvents.adminCounts, {});
    expect(counts.byType).toEqual({ "email.delivered": 1, "email.opened": 2 });
    expect(counts.uniqueOpened).toBe(1);
  });

  it("normalises the address and keeps the click link", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.emailEvents.record, {
      resendId: "re_2",
      type: "email.clicked",
      email: "Person@Example.com",
      link: "https://icodemybusiness.com/book",
      occurredAt: 1000,
    });
    const counts = await t.withIdentity(OWNER).query(api.emailEvents.adminCounts, {});
    expect(counts.uniqueClicked).toBe(1);
  });
});

describe("emailEvents.adminCounts", () => {
  it("refuses an anonymous caller", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.emailEvents.adminCounts, {})).rejects.toThrow("Unauthorized");
  });

  it("refuses a non-owner", async () => {
    const t = convexTest(schema, modules);
    await expect(t.withIdentity(OUTSIDER).query(api.emailEvents.adminCounts, {})).rejects.toThrow("Forbidden");
  });

  it("counts by type and unique addresses for the owner", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.emailEvents.record, opened("re_1", "a@example.com", 1000));
    await t.mutation(internal.emailEvents.record, opened("re_1", "a@example.com", 1500));
    await t.mutation(internal.emailEvents.record, opened("re_2", "b@example.com", 1000));
    await t.mutation(internal.emailEvents.record, { resendId: "re_2", type: "email.clicked", email: "b@example.com", occurredAt: 1200 });
    const counts = await t.withIdentity(OWNER).query(api.emailEvents.adminCounts, { windowDays: 7 });
    expect(counts.windowDays).toBe(7);
    expect(counts.total).toBe(4);
    expect(counts.byType).toEqual({ "email.opened": 3, "email.clicked": 1 });
    expect(counts.uniqueOpened).toBe(2);
    expect(counts.uniqueClicked).toBe(1);
    expect(counts.truncated).toBe(false);
  });

  it("excludes rows received before the window", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("emailEvents", { resendId: "re_old", type: "email.opened", email: "old@example.com", occurredAt: 1, createdAt: Date.now() - 10 * DAY });
      await ctx.db.insert("emailEvents", { resendId: "re_new", type: "email.opened", email: "new@example.com", occurredAt: 2, createdAt: Date.now() - 1 * DAY });
    });
    const counts = await t.withIdentity(OWNER).query(api.emailEvents.adminCounts, { windowDays: 7 });
    expect(counts.total).toBe(1);
    expect(counts.uniqueOpened).toBe(1);
  });

  it("clamps the window to [1, 365] days", async () => {
    const t = convexTest(schema, modules);
    const lo = await t.withIdentity(OWNER).query(api.emailEvents.adminCounts, { windowDays: 0 });
    const hi = await t.withIdentity(OWNER).query(api.emailEvents.adminCounts, { windowDays: 9999 });
    expect(lo.windowDays).toBe(1);
    expect(hi.windowDays).toBe(365);
  });
});
