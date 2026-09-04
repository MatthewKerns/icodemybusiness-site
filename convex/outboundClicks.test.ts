/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const OWNER = {
  subject: "user_owner",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|user_owner",
  email: "matt@icodemybusiness.com",
  emailVerified: true,
};

async function asAdmin(t: TestConvex<typeof schema>) {
  const owner = t.withIdentity(OWNER);
  await owner.mutation(api.users.ensureCurrentUser, {});
  return owner;
}

let savedDomains: string | undefined;

beforeEach(() => {
  savedDomains = process.env.OWNER_EMAIL_DOMAINS;
  process.env.OWNER_EMAIL_DOMAINS = "icodemybusiness.com";
});

afterEach(() => {
  if (savedDomains === undefined) delete process.env.OWNER_EMAIL_DOMAINS;
  else process.env.OWNER_EMAIL_DOMAINS = savedDomains;
  vi.restoreAllMocks();
});

describe("/r/<slug> redirect", () => {
  it("redirects a known slug and counts the click", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/r/clockify", { method: "GET" });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://clockify.me/");

    const rows = await t.run((ctx) => ctx.db.query("outboundClicks").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].slug).toBe("clockify");
  });

  /**
   * The important one. If the destination came from the query string instead of
   * a server-side allowlist, anyone could send a link on our domain that lands
   * on theirs — a phishing primitive wearing our brand.
   */
  it("refuses an unknown slug and records nothing", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/r/evil.example.com", { method: "GET" });

    expect(res.status).toBe(404);
    expect(res.headers.get("location")).toBeNull();

    const rows = await t.run((ctx) => ctx.db.query("outboundClicks").collect());
    expect(rows).toHaveLength(0);
  });

  it("ignores a destination supplied in the query string", async () => {
    const t = convexTest(schema, modules);
    const res = await t.fetch("/r/clockify?to=https://evil.example.com", {
      method: "GET",
    });

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://clockify.me/");
  });

  it("counts repeat clicks separately", async () => {
    const t = convexTest(schema, modules);
    await t.fetch("/r/clockify", { method: "GET" });
    await t.fetch("/r/clockify", { method: "GET" });

    const admin = await asAdmin(t);
    const counts = await admin.query(api.outboundClicks.adminCounts, {});
    expect(counts).toEqual([
      { slug: "clockify", clicks: 2, lastAt: expect.any(Number) },
    ]);
  });

  it("keeps the counts admin-only", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.outboundClicks.adminCounts, {})).rejects.toThrow();
  });
});
