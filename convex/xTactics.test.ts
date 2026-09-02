/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach } from "vitest";
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

const OUTSIDER = {
  subject: "user_outsider",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|user_outsider",
  email: "attacker@gmail.com",
  emailVerified: true,
};

let saved: string | undefined;
beforeEach(() => {
  saved = process.env.OWNER_EMAIL_DOMAINS;
  process.env.OWNER_EMAIL_DOMAINS = "icodemybusiness.com";
});
afterEach(() => {
  if (saved === undefined) delete process.env.OWNER_EMAIL_DOMAINS;
  else process.env.OWNER_EMAIL_DOMAINS = saved;
});

describe("xTactics", () => {
  it("rejects non-owner callers", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.withIdentity(OUTSIDER).mutation(api.xTactics.add, {
        pillar: "clockify",
        text: "tactic",
        source: "test",
      })
    ).rejects.toThrow(/Forbidden/);
  });

  it("assigns sequential per-pillar tactic IDs", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(OWNER);
    const a = await owner.mutation(api.xTactics.add, {
      pillar: "clockify",
      text: "First clockify tactic",
      source: "interview",
    });
    const b = await owner.mutation(api.xTactics.add, {
      pillar: "clockify",
      text: "Second clockify tactic",
      source: "interview",
    });
    const c = await owner.mutation(api.xTactics.add, {
      pillar: "claude",
      text: "First claude tactic",
      source: "interview",
    });
    expect(a.tacticId).toBe("CLK-001");
    expect(b.tacticId).toBe("CLK-002");
    expect(c.tacticId).toBe("CLD-001");
  });

  it("blocks exact duplicates within a pillar", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(OWNER);
    await owner.mutation(api.xTactics.add, {
      pillar: "writing",
      text: "Cut the first sentence",
      source: "interview",
    });
    await expect(
      owner.mutation(api.xTactics.add, {
        pillar: "writing",
        text: "  cut the first sentence ",
        source: "interview",
      })
    ).rejects.toThrow(/Duplicate of WRT-001/);
  });

  it("validates tiesTo references an existing tactic", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(OWNER);
    await expect(
      owner.mutation(api.xTactics.add, {
        pillar: "paper",
        text: "Loop tactic",
        source: "interview",
        tiesTo: "CLK-999",
      })
    ).rejects.toThrow(/CLK-999 not found/);
  });

  it("new tactics start pending; approve stamps approvedAt", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(OWNER);
    const { id } = await owner.mutation(api.xTactics.add, {
      pillar: "paper",
      text: "One problem per session",
      source: "interview",
    });
    const pending = await owner.query(api.xTactics.listByStatus, { status: "pending" });
    expect(pending).toHaveLength(1);

    await owner.mutation(api.xTactics.approve, { id });
    const approved = await owner.query(api.xTactics.listByStatus, { status: "approved" });
    expect(approved).toHaveLength(1);
    expect(typeof approved[0].approvedAt).toBe("number");
  });
});

describe("xAssets", () => {
  it("register is idempotent on driveFileId", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(OWNER);
    const first = await owner.mutation(api.xAssets.register, {
      driveFileId: "abc123",
      driveUrl: "https://drive.google.com/file/d/abc123",
      name: "voice-memo.m4a",
      kind: "audio",
    });
    const second = await owner.mutation(api.xAssets.register, {
      driveFileId: "abc123",
      driveUrl: "https://drive.google.com/file/d/abc123",
      name: "voice-memo.m4a",
      kind: "audio",
    });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.id).toEqual(first.id);
  });

  it("transcription moves an asset out of the unprocessed queue", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(OWNER);
    const { id } = await owner.mutation(api.xAssets.register, {
      driveFileId: "vid1",
      driveUrl: "https://drive.google.com/file/d/vid1",
      name: "walkthrough.mov",
      kind: "video",
    });
    expect(await owner.query(api.xAssets.listUnprocessed, {})).toHaveLength(1);

    await owner.mutation(api.xAssets.setTranscript, { id, transcript: "…spoken content…" });
    expect(await owner.query(api.xAssets.listUnprocessed, {})).toHaveLength(0);

    const asset = await owner.query(api.xAssets.get, { id });
    expect(asset).toMatchObject({ status: "transcribed", transcript: "…spoken content…" });
  });

  it("tactics can link to a registered asset", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity(OWNER);
    const { id: assetId } = await owner.mutation(api.xAssets.register, {
      driveFileId: "plan1",
      driveUrl: "https://drive.google.com/file/d/plan1",
      name: "week-plan.md",
      kind: "plan",
    });
    await owner.mutation(api.xTactics.add, {
      pillar: "claude",
      text: "Hand Claude a goal prompt, not a task list",
      source: "drive:week-plan.md",
      sourceAssetIds: [assetId],
    });
    const rows = await owner.query(api.xTactics.listByPillar, { pillar: "claude" });
    expect(rows[0].sourceAssetIds).toEqual([assetId]);
  });
});
