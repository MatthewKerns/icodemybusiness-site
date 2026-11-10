/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { convexTest } from "convex-test";
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

async function setup() {
  const t = convexTest(schema, modules);
  const leadId = await t.mutation(api.leads.createLead, {
    email: "lead@example.com",
    source: "free-tools",
    sessionId: "session-1",
  });
  return { t, leadId, owner: t.withIdentity(OWNER) };
}

describe("emailOps access", () => {
  it("refuses everyone but the owner, on reads and on writes", async () => {
    const { t, leadId } = await setup();
    const visitor = t.withIdentity(VISITOR);
    await expect(visitor.query(api.emailOps.overview, {})).rejects.toThrow();
    await expect(visitor.query(api.emailOps.listPeople, {})).rejects.toThrow();
    await expect(t.query(api.emailOps.listPeople, {})).rejects.toThrow();
    await expect(
      visitor.mutation(api.emailOps.setStage, { kind: "lead", id: leadId, stage: "won" })
    ).rejects.toThrow();
    await expect(
      visitor.mutation(api.emailOps.setSuppressed, { email: "lead@example.com", suppressed: true })
    ).rejects.toThrow();
    await expect(
      visitor.mutation(api.emailOps.setSequencesPaused, { paused: false })
    ).rejects.toThrow();
  });
});

describe("emailOps.overview", () => {
  it("counts what the site recorded, per message rather than per callback", async () => {
    const { t, owner } = await setup();
    await t.mutation(api.emailSends.record, {
      to: "lead@example.com",
      template: "welcome",
      subject: "Welcome",
      status: "sent",
      resendId: "re_1",
    });
    await t.run(async (ctx) => {
      const base = { resendId: "re_1", email: "lead@example.com", createdAt: Date.now() };
      await ctx.db.insert("emailEvents", { ...base, type: "email.delivered", occurredAt: 1 });
      // The same email opened twice is one open.
      await ctx.db.insert("emailEvents", { ...base, type: "email.opened", occurredAt: 2 });
      await ctx.db.insert("emailEvents", { ...base, type: "email.opened", occurredAt: 3 });
    });

    const o = await owner.query(api.emailOps.overview, { windowDays: 30 });
    expect(o.leads.total).toBe(1);
    expect(o.leads.inWindow).toBe(1);
    expect(o.leads.byStage.new).toBe(1);
    expect(o.leads.bySource).toEqual({ "free-tools": 1 });
    expect(o.sends).toMatchObject({ sent: 1, failed: 0 });
    expect(o.engagement).toMatchObject({ delivered: 1, opened: 1, clicked: 0, callbacks: 3 });
    expect(o.engagement.lastCallbackAt).not.toBeNull();
    // Sequences ship paused.
    expect(o.sequences.paused).toBe(true);
    expect(o.inboxes.backups).toBe(0);
  });

  it("reports which env plumbing is present without returning any value", async () => {
    const { owner } = await setup();
    const saved = process.env.RESEND_WEBHOOK_SECRET;
    process.env.RESEND_WEBHOOK_SECRET = "whsec_do_not_leak";
    try {
      const o = await owner.query(api.emailOps.overview, {});
      expect(o.setup.resendWebhookSecret).toBe(true);
      expect(JSON.stringify(o)).not.toContain("whsec_do_not_leak");
    } finally {
      if (saved === undefined) delete process.env.RESEND_WEBHOOK_SECRET;
      else process.env.RESEND_WEBHOOK_SECRET = saved;
    }
  });
});

describe("pipeline", () => {
  it("moves a lead between stages and shows it in the people list", async () => {
    const { leadId, owner } = await setup();
    await owner.mutation(api.emailOps.setStage, { kind: "lead", id: leadId, stage: "contacted" });
    const { people } = await owner.query(api.emailOps.listPeople, {});
    expect(people).toHaveLength(1);
    expect(people[0]).toMatchObject({ kind: "lead", email: "lead@example.com", stage: "contacted" });
  });

  it("rejects an id that is not a lead", async () => {
    const { owner } = await setup();
    await expect(
      owner.mutation(api.emailOps.setStage, { kind: "lead", id: "not-an-id", stage: "won" })
    ).rejects.toThrow("Lead not found");
  });

  it("keeps notes on the person's timeline", async () => {
    const { leadId, owner } = await setup();
    await owner.mutation(api.emailOps.addNote, {
      kind: "lead",
      id: leadId,
      text: "  Met at the meetup  ",
    });
    const person = await owner.query(api.emailOps.getPerson, { kind: "lead", id: leadId });
    expect(
      person?.timeline.some((i) => i.kind === "note" && i.detail === "Met at the meetup")
    ).toBe(true);
    await expect(
      owner.mutation(api.emailOps.addNote, { kind: "lead", id: leadId, text: "   " })
    ).rejects.toThrow();
  });
});

describe("emailOps.logReply", () => {
  it("an interested reply moves the person forward and waits for an answer", async () => {
    const { leadId, owner } = await setup();
    const replyId = await owner.mutation(api.emailOps.logReply, {
      email: "Lead@Example.com",
      category: "positive_interested",
      text: "Yes, what times work?",
    });
    const person = await owner.query(api.emailOps.getPerson, { kind: "lead", id: leadId });
    expect(person?.stage).toBe("interested");
    expect(person?.openReplies).toHaveLength(1);

    const o = await owner.query(api.emailOps.overview, {});
    expect(o.outbound.replies.unhandled).toBe(1);

    await owner.mutation(api.emailOps.setReplyHandled, { replyId, handled: true });
    expect(await owner.query(api.emailOps.listReplies, { onlyOpen: true })).toEqual([]);
  });

  it("an unsubscribe reply suppresses the address and needs no answer", async () => {
    const { leadId, owner } = await setup();
    await owner.mutation(api.emailOps.logReply, {
      email: "lead@example.com",
      category: "unsubscribe",
    });
    const person = await owner.query(api.emailOps.getPerson, { kind: "lead", id: leadId });
    expect(person?.stage).toBe("lost");
    expect(person?.suppressed).toBe(true);
    expect(person?.openReplies).toEqual([]);
  });

  it("never walks a booked person back to an earlier stage", async () => {
    const { leadId, owner } = await setup();
    await owner.mutation(api.emailOps.setStage, { kind: "lead", id: leadId, stage: "booked" });
    await owner.mutation(api.emailOps.logReply, {
      email: "lead@example.com",
      category: "neutral_question",
    });
    const person = await owner.query(api.emailOps.getPerson, { kind: "lead", id: leadId });
    expect(person?.stage).toBe("booked");
  });

  it("refuses a reply from an address nobody has on file", async () => {
    const { owner } = await setup();
    await expect(
      owner.mutation(api.emailOps.logReply, { email: "stranger@example.com", category: "other" })
    ).rejects.toThrow();
  });
});

describe("suppression and sequence controls", () => {
  it("stops and re-allows email to an address", async () => {
    const { owner } = await setup();
    await owner.mutation(api.emailOps.setSuppressed, {
      email: "lead@example.com",
      suppressed: true,
    });
    let rows = await owner.query(api.emailOps.listSuppressions, {});
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: "lead@example.com",
      reason: "manual",
      scope: "all",
      live: true,
    });

    await owner.mutation(api.emailOps.setSuppressed, {
      email: "lead@example.com",
      suppressed: false,
    });
    rows = await owner.query(api.emailOps.listSuppressions, {});
    expect(rows[0].live).toBe(false);
  });

  it("flips the global sequence switch, creating the settings row if needed", async () => {
    const { owner } = await setup();
    expect((await owner.query(api.emailOps.sequences, {})).paused).toBe(true);
    await owner.mutation(api.emailOps.setSequencesPaused, { paused: false });
    expect((await owner.query(api.emailOps.sequences, {})).paused).toBe(false);
    await owner.mutation(api.emailOps.setSequencesPaused, { paused: true });
    expect((await owner.query(api.emailOps.sequences, {})).paused).toBe(true);
  });
});

describe("a booking made in the Calendly embed", () => {
  it("moves that visitor's lead to booked", async () => {
    const { t, leadId, owner } = await setup();
    await t.mutation(api.visitorEvents.track, {
      name: "consultation_booked",
      category: "decision",
      sessionId: "session-1",
    });
    const person = await owner.query(api.emailOps.getPerson, { kind: "lead", id: leadId });
    expect(person?.stage).toBe("booked");
  });

  it("does nothing to a lead from another session, or a lead already won", async () => {
    const { t, leadId, owner } = await setup();
    await t.mutation(api.visitorEvents.track, {
      name: "consultation_booked",
      category: "decision",
      sessionId: "someone-else",
    });
    expect(
      (await owner.query(api.emailOps.getPerson, { kind: "lead", id: leadId }))?.stage
    ).toBe("new");

    await owner.mutation(api.emailOps.setStage, { kind: "lead", id: leadId, stage: "won" });
    await t.mutation(api.visitorEvents.track, {
      name: "consultation_booked",
      category: "decision",
      sessionId: "session-1",
    });
    expect(
      (await owner.query(api.emailOps.getPerson, { kind: "lead", id: leadId }))?.stage
    ).toBe("won");
  });
});
