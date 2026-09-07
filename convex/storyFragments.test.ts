/// <reference types="vite/client" />
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
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

const STRANGER = {
  subject: "user_stranger",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|user_stranger",
  email: "someone@example.com",
  emailVerified: true,
};

let savedDomains: string | undefined;
let savedKey: string | undefined;

beforeEach(() => {
  // finishAllScheduledFunctions drives convex-test's scheduler through the
  // timer queue, so the fake timers have to be installed first.
  vi.useFakeTimers();
  savedDomains = process.env.OWNER_EMAIL_DOMAINS;
  savedKey = process.env.ANTHROPIC_API_KEY;
  process.env.OWNER_EMAIL_DOMAINS = "icodemybusiness.com";
  delete process.env.ANTHROPIC_API_KEY; // classifier degrades rather than calls out
});

afterEach(() => {
  if (savedDomains === undefined) delete process.env.OWNER_EMAIL_DOMAINS;
  else process.env.OWNER_EMAIL_DOMAINS = savedDomains;
  if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
  else process.env.ANTHROPIC_API_KEY = savedKey;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function asOwner(t: TestConvex<typeof schema>) {
  return t.withIdentity(OWNER);
}

describe("access", () => {
  it("refuses a signed-out caller everywhere", async () => {
    const t = convexTest(schema, modules);
    await expect(t.query(api.storyFragments.list, {})).rejects.toThrow();
    await expect(t.query(api.storyFragments.coverage, {})).rejects.toThrow();
    await expect(
      t.mutation(api.storyFragments.add, { text: "hello" })
    ).rejects.toThrow();
  });

  /**
   * The important one. This table holds the most personal material on the
   * site, and the owner gate derives from the verified Clerk identity rather
   * than `users.role`, which was historically client-writable.
   */
  it("refuses a signed-in stranger", async () => {
    const t = convexTest(schema, modules);
    const stranger = t.withIdentity(STRANGER);
    await expect(stranger.query(api.storyFragments.list, {})).rejects.toThrow();
    await expect(
      stranger.mutation(api.storyFragments.add, { text: "hello" })
    ).rejects.toThrow();
  });
});

describe("adding fragments", () => {
  it("stores the text verbatim and schedules filing", async () => {
    const t = convexTest(schema, modules);
    const owner = asOwner(t);
    const text = "  Empty bank account, lower and lower zeros.\n\nThe stocks ran out.  ";
    await owner.mutation(api.storyFragments.add, { text });

    const rows = await owner.query(api.storyFragments.list, {});
    expect(rows).toHaveLength(1);
    // Trimmed at the edges, untouched inside — the line break survives.
    expect(rows[0].text).toBe(
      "Empty bank account, lower and lower zeros.\n\nThe stocks ran out."
    );
    expect(rows[0].routingPending).toBe(true);
  });

  it("rejects an empty fragment", async () => {
    const t = convexTest(schema, modules);
    const owner = asOwner(t);
    await expect(
      owner.mutation(api.storyFragments.add, { text: "   " })
    ).rejects.toThrow();
  });

  it("marks a fragment when filing could not run, without losing it", async () => {
    const t = convexTest(schema, modules);
    const owner = asOwner(t);
    await owner.mutation(api.storyFragments.add, { text: "a memory" });
    await t.finishAllScheduledFunctions(vi.runAllTimers);

    const rows = await owner.query(api.storyFragments.list, {});
    expect(rows[0].text).toBe("a memory");
    expect(rows[0].routingPending).toBe(false);
    expect(rows[0].routingError).toBeTruthy();
  });
});

describe("routing", () => {
  it("only accepts ids that exist in the question set", async () => {
    const t = convexTest(schema, modules);
    const owner = asOwner(t);
    const id = await owner.mutation(api.storyFragments.add, { text: "x" });
    await expect(
      owner.mutation(api.storyFragments.setRouting, {
        fragmentId: id,
        questionIds: ["A1", "NOPE"],
      })
    ).rejects.toThrow();
  });

  it("drops unknown ids proposed by the classifier rather than storing them", async () => {
    const t = convexTest(schema, modules);
    const owner = asOwner(t);
    const id = await owner.mutation(api.storyFragments.add, { text: "x" });
    await t.mutation(internal.storyFragments.applyRouting, {
      fragmentId: id,
      questionIds: ["A1", "hallucinated", "B1"],
      failed: false,
    });
    const rows = await owner.query(api.storyFragments.list, {});
    expect(rows[0].questionIds).toEqual(["A1", "B1"]);
  });

  /** A hand-correction must not be undone by a slow classifier reply. */
  it("lets a hand-correction win over a late automatic proposal", async () => {
    const t = convexTest(schema, modules);
    const owner = asOwner(t);
    const id = await owner.mutation(api.storyFragments.add, { text: "x" });

    await owner.mutation(api.storyFragments.setRouting, {
      fragmentId: id,
      questionIds: ["A5"],
    });
    await t.mutation(internal.storyFragments.applyRouting, {
      fragmentId: id,
      questionIds: ["H3"],
      failed: false,
    });

    const rows = await owner.query(api.storyFragments.list, {});
    expect(rows[0].questionIds).toEqual(["A5"]);
    expect(rows[0].routingSource).toBe("manual");
  });

  it("never alters the text when routing changes", async () => {
    const t = convexTest(schema, modules);
    const owner = asOwner(t);
    const original = "I thought that was just what running a business was.";
    const id = await owner.mutation(api.storyFragments.add, { text: original });

    await owner.mutation(api.storyFragments.setRouting, {
      fragmentId: id,
      questionIds: ["A4"],
    });
    await t.mutation(internal.storyFragments.applyRouting, {
      fragmentId: id,
      questionIds: ["B1"],
      failed: false,
    });
    await owner.mutation(api.storyFragments.archive, { fragmentId: id });

    const all = await owner.query(api.storyFragments.list, {
      includeArchived: true,
    });
    expect(all[0].text).toBe(original);
  });
});

describe("archiving", () => {
  it("hides an archived fragment but keeps it, and can undo", async () => {
    const t = convexTest(schema, modules);
    const owner = asOwner(t);
    const id = await owner.mutation(api.storyFragments.add, { text: "keep me" });

    await owner.mutation(api.storyFragments.archive, { fragmentId: id });
    expect(await owner.query(api.storyFragments.list, {})).toHaveLength(0);
    expect(
      await owner.query(api.storyFragments.list, { includeArchived: true })
    ).toHaveLength(1);

    await owner.mutation(api.storyFragments.archive, {
      fragmentId: id,
      undo: true,
    });
    expect(await owner.query(api.storyFragments.list, {})).toHaveLength(1);
  });
});

describe("coverage", () => {
  it("counts only live fragments and reports the blocking gap", async () => {
    const t = convexTest(schema, modules);
    const owner = asOwner(t);

    const before = await owner.query(api.storyFragments.coverage, {});
    expect(before.blockingTotal).toBe(15); // A1–A9 plus B1–B6
    expect(before.blockingCovered).toBe(0);

    await t.mutation(internal.storyFragments.seed, {
      text: "the money ran out",
      questionIds: ["A5"],
    });
    await t.mutation(internal.storyFragments.seed, {
      text: "feast and famine",
      questionIds: ["A5", "B1"],
    });

    const after = await owner.query(api.storyFragments.coverage, {});
    expect(after.blockingCovered).toBe(2);
    expect(after.rows.find((r) => r.id === "A5")?.fragmentCount).toBe(2);
    expect(after.rows.find((r) => r.id === "B1")?.fragmentCount).toBe(1);
    expect(after.rows.find((r) => r.id === "A1")?.fragmentCount).toBe(0);
  });

  it("reports fragments that were filed nowhere", async () => {
    const t = convexTest(schema, modules);
    const owner = asOwner(t);
    await t.mutation(internal.storyFragments.seed, {
      text: "an orphan thought",
      questionIds: [],
    });
    const cov = await owner.query(api.storyFragments.coverage, {});
    expect(cov.unrouted).toBe(1);
  });
});
