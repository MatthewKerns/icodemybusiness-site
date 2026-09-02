/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

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
    expect(await t.query(api.emailSends.listRecent, {})).toEqual([]);
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

    const rows = await t.query(api.emailSends.listForEmail, { email: "person@example.com" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      to: "person@example.com",
      template: "welcome",
      status: "sent",
      resendId: "re_ok",
      leadId,
    });

    const lead = await t.query(api.leads.getLeadByEmail, { email: "person@example.com" });
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
    const rows = await t.query(api.emailSends.listRecent, { limit: 5 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: "failed", error: "Domain not verified" });

    const lead = await t.query(api.leads.getLeadByEmail, { email: "fail@example.com" });
    expect(lead?.welcomeEmailSentAt).toBeUndefined();
  });
});
