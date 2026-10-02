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

const VISITOR = {
  subject: "user_visitor",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|user_visitor",
  email: "visitor@example.com",
  emailVerified: true,
};

/** requireRole("admin") needs a users row, not just the JWT: seed the owner. */
async function asAdmin(t: TestConvex<typeof schema>) {
  const owner = t.withIdentity(OWNER);
  await owner.mutation(api.users.ensureCurrentUser, {});
  return owner;
}

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
  vi.restoreAllMocks();
  vi.useRealTimers();
});

async function withLead(email: string) {
  const t = convexTest(schema, modules);
  const leadId = await t.mutation(api.leads.createLead, {
    email,
    source: "test",
    sessionId: "s1",
  });
  return { t, leadId };
}

describe("emailSends.record", () => {
  it("ignores addresses that were never captured as a lead", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(api.emailSends.record, {
      to: "nobody@example.com",
      template: "welcome",
      subject: "Welcome",
      status: "sent",
      resendId: "re_1",
    });
    expect(id).toBeNull();
    const admin = await asAdmin(t);
    expect(await admin.query(api.emailSends.listRecent, {})).toEqual([]);
  });

  it("logs a successful welcome send and stamps the lead", async () => {
    const { t, leadId } = await withLead("Person@Example.com");
    const id = await t.mutation(api.emailSends.record, {
      to: "person@example.com",
      template: "welcome",
      subject: "Welcome",
      status: "sent",
      resendId: "re_ok",
    });
    expect(id).not.toBeNull();

    const admin = await asAdmin(t);
    const rows = await admin.query(api.emailSends.listForEmail, {
      email: "person@example.com",
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      to: "person@example.com",
      template: "welcome",
      status: "sent",
      resendId: "re_ok",
      leadId,
    });

    const lead = await t.query(api.leads.getLeadByEmail, {
      email: "person@example.com",
    });
    expect(lead?.welcomeEmailResendId).toBe("re_ok");
    expect(typeof lead?.welcomeEmailSentAt).toBe("number");
  });

  it("logs a failed send without marking the lead as welcomed", async () => {
    const { t } = await withLead("fail@example.com");
    await t.mutation(api.emailSends.record, {
      to: "fail@example.com",
      template: "welcome",
      subject: "Welcome",
      status: "failed",
      error: "Domain not verified",
    });
    const admin = await asAdmin(t);
    const rows = await admin.query(api.emailSends.listRecent, { limit: 5 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: "failed",
      error: "Domain not verified",
    });

    const lead = await t.query(api.leads.getLeadByEmail, {
      email: "fail@example.com",
    });
    expect(lead?.welcomeEmailSentAt).toBeUndefined();
  });
});

/**
 * New 2026-09-04. Until then both read queries were public, so anyone holding
 * the Convex deployment URL could enumerate every address the site had ever
 * emailed. The three tests above gained `asAdmin` for the same reason — every
 * assertion they already made is unchanged.
 */
describe("emailSends read gating", () => {
  it("refuses a signed-out caller", async () => {
    const { t } = await withLead("gated@example.com");
    await expect(t.query(api.emailSends.listRecent, {})).rejects.toThrow();
    await expect(
      t.query(api.emailSends.listForEmail, { email: "gated@example.com" })
    ).rejects.toThrow();
  });

  it("refuses a signed-in visitor who is not an admin", async () => {
    const { t } = await withLead("gated2@example.com");
    const visitor = t.withIdentity(VISITOR);
    await visitor.mutation(api.users.ensureCurrentUser, {});
    await expect(visitor.query(api.emailSends.listRecent, {})).rejects.toThrow();
    await expect(
      visitor.query(api.emailSends.listForEmail, { email: "gated2@example.com" })
    ).rejects.toThrow();
  });
});
