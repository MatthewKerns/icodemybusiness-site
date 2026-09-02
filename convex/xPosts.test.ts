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

/** Owner client with one approved clockify tactic in the bank. */
async function seeded() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity(OWNER);
  const { id, tacticId } = await owner.mutation(api.xTactics.add, {
    pillar: "clockify",
    text: "Write the time entry before you start the timer",
    source: "interview 2026-09-02",
  });
  await owner.mutation(api.xTactics.approve, { id });
  return { t, owner, tacticId };
}

describe("xPosts.createBatch", () => {
  it("rejects callers who are not the owner", async () => {
    const { t, tacticId } = await seeded();
    await expect(
      t.withIdentity(OUTSIDER).mutation(api.xPosts.createBatch, {
        batchKey: "2026-09-02",
        posts: [{ text: "hi", pillar: "clockify", tacticIds: [tacticId], isLoop: false }],
      })
    ).rejects.toThrow(/Forbidden/);
  });

  it("rejects a post over the 140-char cap", async () => {
    const { owner, tacticId } = await seeded();
    await expect(
      owner.mutation(api.xPosts.createBatch, {
        batchKey: "2026-09-02",
        posts: [
          { text: "x".repeat(141), pillar: "clockify", tacticIds: [tacticId], isLoop: false },
        ],
      })
    ).rejects.toThrow(/140-char cap/);
  });

  it("rejects a post whose tactic is not approved", async () => {
    const { owner } = await seeded();
    const { tacticId: pendingId } = await owner.mutation(api.xTactics.add, {
      pillar: "paper",
      text: "Start the map from the right edge of the page",
      source: "interview 2026-09-02",
    });
    await expect(
      owner.mutation(api.xPosts.createBatch, {
        batchKey: "2026-09-02",
        posts: [{ text: "post", pillar: "paper", tacticIds: [pendingId], isLoop: false }],
      })
    ).rejects.toThrow(/pending, not approved/);
  });

  it("rejects a post with no tactic ID", async () => {
    const { owner } = await seeded();
    await expect(
      owner.mutation(api.xPosts.createBatch, {
        batchKey: "2026-09-02",
        posts: [{ text: "post", pillar: "clockify", tacticIds: [], isLoop: false }],
      })
    ).rejects.toThrow(/must trace to the bank/);
  });

  it("inserts drafts with charCount and batchKey", async () => {
    const { owner, tacticId } = await seeded();
    const result = await owner.mutation(api.xPosts.createBatch, {
      batchKey: "2026-09-02",
      posts: [
        {
          text: "Write the entry before you start the timer.",
          pillar: "clockify",
          tacticIds: [tacticId],
          isLoop: false,
        },
      ],
    });
    expect(result.inserted).toBe(1);

    const batch = await owner.query(api.xPosts.listBatch, { batchKey: "2026-09-02" });
    expect(batch).toHaveLength(1);
    expect(batch[0]).toMatchObject({
      status: "draft",
      charCount: 43,
      batchKey: "2026-09-02",
      tacticIds: [tacticId],
    });
  });
});

describe("xPosts review lifecycle", () => {
  async function withDraft() {
    const { owner, tacticId } = await seeded();
    await owner.mutation(api.xPosts.createBatch, {
      batchKey: "2026-09-02",
      posts: [
        { text: "Draft post", pillar: "clockify", tacticIds: [tacticId], isLoop: false },
      ],
    });
    const [post] = await owner.query(api.xPosts.listBatch, { batchKey: "2026-09-02" });
    return { owner, post };
  }

  it("sign-off moves draft → signedOff and stamps the time", async () => {
    const { owner, post } = await withDraft();
    await owner.mutation(api.xPosts.signOff, { id: post._id });
    const signed = await owner.query(api.xPosts.listSignedOff, {});
    expect(signed).toHaveLength(1);
    expect(typeof signed[0].signedOffAt).toBe("number");
  });

  it("editText re-validates the cap and marks the post edited", async () => {
    const { owner, post } = await withDraft();
    await expect(
      owner.mutation(api.xPosts.editText, { id: post._id, text: "y".repeat(200) })
    ).rejects.toThrow(/140-char cap/);

    await owner.mutation(api.xPosts.editText, { id: post._id, text: "Tighter post" });
    const [updated] = await owner.query(api.xPosts.listBatch, { batchKey: "2026-09-02" });
    expect(updated).toMatchObject({ text: "Tighter post", charCount: 12, status: "edited" });
  });

  it("a rejected post cannot be signed off", async () => {
    const { owner, post } = await withDraft();
    await owner.mutation(api.xPosts.reject, { id: post._id, reviewNote: "off-voice" });
    await expect(
      owner.mutation(api.xPosts.signOff, { id: post._id })
    ).rejects.toThrow(/Cannot sign off a rejected post/);
  });
});
