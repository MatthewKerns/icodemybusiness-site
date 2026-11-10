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

let savedDomains: string | undefined;

beforeEach(() => {
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

function setup() {
  const t = convexTest(schema, modules);
  return { t, owner: t.withIdentity(OWNER) };
}

const STEP = { subject: "question for {{first_name}}", body: "Body", delayDays: 0 };

describe("campaigns", () => {
  it("is owner-only", async () => {
    const { t } = setup();
    await expect(t.query(api.outbound.listCampaigns, {})).rejects.toThrow();
    await expect(t.mutation(api.outbound.saveCampaign, { name: "X", steps: [] })).rejects.toThrow();
    await expect(
      t.mutation(api.outbound.importProspects, { source: "csv", prospects: [] })
    ).rejects.toThrow();
    await expect(
      t.mutation(api.outbound.saveInbox, { email: "a@send-one.com", status: "warming" })
    ).rejects.toThrow();
  });

  it("starts as a draft with Instantly as the sender, and stamps the launch once", async () => {
    const { owner } = setup();
    const id = await owner.mutation(api.outbound.saveCampaign, {
      name: " Agencies Q4 ",
      steps: [STEP],
    });
    let [c] = await owner.query(api.outbound.listCampaigns, {});
    expect(c).toMatchObject({
      name: "Agencies Q4",
      status: "draft",
      sender: "instantly",
      launchedAt: null,
    });

    await owner.mutation(api.outbound.setCampaignStatus, { campaignId: id, status: "live" });
    [c] = await owner.query(api.outbound.listCampaigns, {});
    const launchedAt = c.launchedAt;
    expect(launchedAt).not.toBeNull();

    await owner.mutation(api.outbound.setCampaignStatus, { campaignId: id, status: "paused" });
    await owner.mutation(api.outbound.setCampaignStatus, { campaignId: id, status: "live" });
    [c] = await owner.query(api.outbound.listCampaigns, {});
    expect(c.launchedAt).toBe(launchedAt);
  });

  it("rejects a nameless campaign and impossible totals", async () => {
    const { owner } = setup();
    await expect(
      owner.mutation(api.outbound.saveCampaign, { name: "  ", steps: [] })
    ).rejects.toThrow();
    const id = await owner.mutation(api.outbound.saveCampaign, { name: "A", steps: [] });
    await expect(
      owner.mutation(api.outbound.reportCampaignTotals, { campaignId: id, sent: 10, bounced: 11 })
    ).rejects.toThrow();
    await expect(
      owner.mutation(api.outbound.reportCampaignTotals, { campaignId: id, sent: -1, bounced: 0 })
    ).rejects.toThrow();
  });

  it("counts people who replied, not messages, and leaves auto-replies out", async () => {
    const { owner } = setup();
    const id = await owner.mutation(api.outbound.saveCampaign, { name: "A", steps: [STEP] });
    await owner.mutation(api.outbound.importProspects, {
      campaignId: id,
      source: "csv",
      prospects: [
        { email: "a@example.com" },
        { email: "b@example.com" },
        { email: "c@example.com" },
      ],
    });
    await owner.mutation(api.outbound.reportCampaignTotals, {
      campaignId: id,
      sent: 300,
      bounced: 3,
    });
    await owner.mutation(api.emailOps.logReply, {
      email: "a@example.com",
      category: "neutral_question",
    });
    await owner.mutation(api.emailOps.logReply, {
      email: "a@example.com",
      category: "positive_interested",
    });
    await owner.mutation(api.emailOps.logReply, { email: "b@example.com", category: "ooo" });
    await owner.mutation(api.emailOps.logReply, {
      email: "c@example.com",
      category: "unsubscribe",
    });

    const [c] = await owner.query(api.outbound.listCampaigns, {});
    expect(c).toMatchObject({
      prospects: 3,
      reportedSent: 300,
      reportedBounced: 3,
      replied: 2,
      positive: 1,
      unsubscribed: 1,
    });
    expect(c.byStage.interested).toBe(1);
    expect(c.byStage.lost).toBe(1);
  });
});

describe("importProspects", () => {
  it("skips and counts everything that should not be mailed", async () => {
    const { t, owner } = setup();
    await t.mutation(api.leads.createLead, { email: "lead@example.com", source: "free-tools" });
    await owner.mutation(api.emailOps.setSuppressed, {
      email: "gone@example.com",
      suppressed: true,
    });

    const first = await owner.mutation(api.outbound.importProspects, {
      source: "csv",
      prospects: [
        { email: "New@Example.com", firstName: "New" },
        { email: "new@example.com" },
        { email: "not-an-email" },
        { email: "lead@example.com" },
        { email: "gone@example.com" },
      ],
    });
    expect(first).toEqual({ added: 1, invalid: 1, duplicate: 1, suppressed: 1, alreadyLead: 1 });

    const again = await owner.mutation(api.outbound.importProspects, {
      source: "csv",
      prospects: [{ email: "new@example.com" }],
    });
    expect(again).toMatchObject({ added: 0, duplicate: 1 });

    const { people } = await owner.query(api.emailOps.listPeople, {});
    expect(people.filter((p) => p.kind === "prospect")).toHaveLength(1);
  });

  it("never creates a lead: a prospect did not give us their address", async () => {
    const { t, owner } = setup();
    await owner.mutation(api.outbound.importProspects, {
      source: "csv",
      prospects: [{ email: "cold@example.com" }],
    });
    expect(await t.query(api.leads.getLeadByEmail, { email: "cold@example.com" })).toBeNull();
  });
});

describe("sending inboxes", () => {
  it("counts warming and ready inboxes as backups", async () => {
    const { owner } = setup();
    for (const [email, status] of [
      ["a@send-one.com", "warming"],
      ["b@send-one.com", "ready"],
      ["c@send-two.com", "sending"],
      ["d@send-two.com", "flagged"],
    ] as const) {
      await owner.mutation(api.outbound.saveInbox, { email, status });
    }
    const data = await owner.query(api.outbound.listInboxes, {});
    expect(data.inboxes).toHaveLength(4);
    expect(data.backups).toBe(2);
    expect(data.backupMin).toBe(3);
    expect(data.backupMax).toBe(5);
    // A warm-up with no date starts today.
    expect(data.inboxes.find((i) => i.email === "a@send-one.com")?.warmupStartedAt).not.toBeNull();
    expect((await owner.query(api.emailOps.overview, {})).inboxes.backups).toBe(2);
  });

  it("refuses the same address twice, and keeps the warm-up date across a status change", async () => {
    const { owner } = setup();
    const id = await owner.mutation(api.outbound.saveInbox, {
      email: "a@send-one.com",
      status: "warming",
    });
    await expect(
      owner.mutation(api.outbound.saveInbox, { email: "A@send-one.com", status: "ready" })
    ).rejects.toThrow();

    const before = (await owner.query(api.outbound.listInboxes, {})).inboxes[0].warmupStartedAt;
    await owner.mutation(api.outbound.saveInbox, {
      inboxId: id,
      email: "a@send-one.com",
      status: "ready",
    });
    const after = (await owner.query(api.outbound.listInboxes, {})).inboxes[0];
    expect(after.status).toBe("ready");
    expect(after.warmupStartedAt).toBe(before);
  });
});
