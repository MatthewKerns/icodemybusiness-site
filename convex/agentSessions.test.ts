/// <reference types="vite/client" />
/**
 * The ownership model for agent sessions.
 *
 * Before this, every function here branched only on whether the row existed, so
 * possession of a `da_…` session id — `Math.random()`-derived, never rotated —
 * was full read and write access to a stranger's transcript and the revenue and
 * hours extracted from it.
 *
 * The model these cases pin: a session nobody has claimed stays reachable by its
 * id, because an anonymous visitor has no identity and the assessment has to
 * work signed-out. Once a signed-in visitor binds it, the id stops being enough.
 * Binding is one-way.
 */
import { describe, it, expect } from "vitest";
import { convexTest, type TestConvex } from "convex-test";
import { api } from "./_generated/api";
import schema from "./schema";
import { DISCOVERY_STAGE } from "../src/content/discovery-questions";

const modules = import.meta.glob("./**/*.ts");

const SESSION = "da_owned_1";
const AGENT_KIND = "discovery-assessment";

const VISITOR = {
  subject: "user_visitor",
  issuer: "https://clerk.test",
  tokenIdentifier: "https://clerk.test|user_visitor",
  email: "visitor@example.com",
  emailVerified: true,
};
const OTHER = {
  ...VISITOR,
  subject: "user_other",
  tokenIdentifier: "https://clerk.test|user_other",
};

async function anonSession(sessionId = SESSION) {
  const t = convexTest(schema, modules);
  await t.mutation(api.agentSessions.getOrCreate, {
    sessionId,
    agentKind: AGENT_KIND,
    source: "homepage",
  });
  return t;
}

/** A session that has been answered into and then bound to VISITOR. */
async function boundSession(opts: { stage?: number; turns?: number } = {}) {
  const t = await anonSession();
  for (let i = 0; i < (opts.turns ?? 2); i++) {
    await t.mutation(api.agentSessions.appendMessage, {
      sessionId: SESSION,
      role: i % 2 === 0 ? "assistant" : "user",
      content: i % 2 === 0 ? "What's your biggest frustration?" : "Mondays.",
    });
  }
  await t.mutation(api.agentSessions.updateDiscoveryState, {
    sessionId: SESSION,
    discoveryState: {
      stage: opts.stage ?? 1,
      followUpsUsed: 0,
      answers: {
        problem: { summary: "You lose Mondays to re-keying orders.", quotes: [] },
      },
      recapConfirmed: false,
    },
  });
  await t.withIdentity(VISITOR).mutation(api.agentSessions.bindToAccount, {
    sessionId: SESSION,
  });
  return t;
}

describe("unclaimed sessions stay open", () => {
  it("serves an anonymous caller, because a signed-out assessment must work", async () => {
    const t = await anonSession();
    const ctx = await t.query(api.agentSessions.getForServer, {
      sessionId: SESSION,
    });
    expect(ctx?.session.sessionId).toBe(SESSION);
    await expect(
      t.mutation(api.agentSessions.appendMessage, {
        sessionId: SESSION,
        role: "user",
        content: "Mondays.",
      })
    ).resolves.not.toThrow();
  });
});

describe("bound sessions are identity-protected", () => {
  it("refuses an anonymous caller holding the session id", async () => {
    const t = await boundSession();
    await expect(
      t.query(api.agentSessions.getForServer, { sessionId: SESSION })
    ).rejects.toThrow(/another account/);
  });

  it("refuses a different signed-in account", async () => {
    const t = await boundSession();
    const other = t.withIdentity(OTHER);
    await expect(
      other.query(api.agentSessions.getForServer, { sessionId: SESSION })
    ).rejects.toThrow(/another account/);
    await expect(
      other.mutation(api.agentSessions.appendMessage, {
        sessionId: SESSION,
        role: "user",
        content: "let me in",
      })
    ).rejects.toThrow(/another account/);
    await expect(
      other.query(api.agentSessions.getBySessionId, { sessionId: SESSION })
    ).rejects.toThrow(/another account/);
    await expect(
      other.query(api.agentSessions.listMessages, { sessionId: SESSION })
    ).rejects.toThrow(/another account/);
  });

  it("still serves the owner", async () => {
    const t = await boundSession();
    const me = t.withIdentity(VISITOR);
    const ctx = await me.query(api.agentSessions.getForServer, {
      sessionId: SESSION,
    });
    expect(ctx?.session.clerkUserId).toBe(VISITOR.subject);
    await expect(
      me.mutation(api.agentSessions.updateDiscoveryState, {
        sessionId: SESSION,
        discoveryState: { stage: 2, followUpsUsed: 0, answers: {} },
      })
    ).resolves.not.toThrow();
  });

  it("does not hand a bound session back through getOrCreate", async () => {
    const t = await boundSession();
    await expect(
      t.mutation(api.agentSessions.getOrCreate, {
        sessionId: SESSION,
        agentKind: AGENT_KIND,
        source: "homepage",
      })
    ).rejects.toThrow(/another account/);
  });
});

describe("bindToAccount", () => {
  it("rejects a signed-out caller", async () => {
    const t = await anonSession();
    await expect(
      t.mutation(api.agentSessions.bindToAccount, { sessionId: SESSION })
    ).rejects.toThrow(/Unauthorized/);
  });

  it("rejects an unknown session", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t
        .withIdentity(VISITOR)
        .mutation(api.agentSessions.bindToAccount, { sessionId: "da_nope" })
    ).rejects.toThrow(/Session not found/);
  });

  it("is idempotent for the owner", async () => {
    const t = await boundSession();
    await expect(
      t
        .withIdentity(VISITOR)
        .mutation(api.agentSessions.bindToAccount, { sessionId: SESSION })
    ).resolves.toEqual({ bound: true });
  });

  it("refuses to re-bind someone else's session", async () => {
    const t = await boundSession();
    await expect(
      t
        .withIdentity(OTHER)
        .mutation(api.agentSessions.bindToAccount, { sessionId: SESSION })
    ).rejects.toThrow(/another account/);
  });
});

describe("bindStatus", () => {
  it("tells a signed-out caller nothing", async () => {
    const t = await anonSession();
    expect(
      await t.query(api.agentSessions.bindStatus, { sessionId: SESSION })
    ).toBeNull();
  });

  it("reports a session that does not exist yet", async () => {
    const t = convexTest(schema, modules);
    expect(
      await t
        .withIdentity(VISITOR)
        .query(api.agentSessions.bindStatus, { sessionId: "da_nope" })
    ).toEqual({ exists: false, boundToMe: false, boundToOther: false });
  });

  it("distinguishes mine from someone else's", async () => {
    const t = await boundSession();
    expect(
      await t
        .withIdentity(VISITOR)
        .query(api.agentSessions.bindStatus, { sessionId: SESSION })
    ).toEqual({ exists: true, boundToMe: true, boundToOther: false });
    expect(
      await t
        .withIdentity(OTHER)
        .query(api.agentSessions.bindStatus, { sessionId: SESSION })
    ).toEqual({ exists: true, boundToMe: false, boundToOther: true });
  });
});

describe("portalListUnfinished", () => {
  it("returns nothing to a signed-out caller", async () => {
    const t = await boundSession();
    expect(
      await t.query(api.agentSessions.portalListUnfinished, {})
    ).toEqual([]);
  });

  it("lists the visitor's own unfinished assessment", async () => {
    const t = await boundSession({ stage: 1 });
    const rows = await t
      .withIdentity(VISITOR)
      .query(api.agentSessions.portalListUnfinished, {});
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0]).sort()).toEqual([
      "problem",
      "questionCount",
      "sessionId",
      "stage",
      "startedAt",
    ]);
    expect(rows[0].sessionId).toBe(SESSION);
    expect(rows[0].stage).toBe(1);
    expect(rows[0].problem).toBe("You lose Mondays to re-keying orders.");
  });

  it("never leaks another account's sessions", async () => {
    const t = await boundSession();
    expect(
      await t
        .withIdentity(OTHER)
        .query(api.agentSessions.portalListUnfinished, {})
    ).toEqual([]);
  });

  it("hides a session the visitor never actually answered", async () => {
    // getOrCreate fires on every homepage mount, so a signed-in visitor who
    // merely scrolls past the assessment gets a row. Listing it would show a
    // phantom "in progress" they never started.
    const t = await boundSession({ turns: 1 });
    const rows = await t
      .withIdentity(VISITOR)
      .query(api.agentSessions.portalListUnfinished, {});
    expect(rows).toEqual([]);
  });

  it("hides a finished assessment", async () => {
    const t = await boundSession({ stage: DISCOVERY_STAGE.SUBMITTED });
    const rows = await t
      .withIdentity(VISITOR)
      .query(api.agentSessions.portalListUnfinished, {});
    expect(rows).toEqual([]);
  });

  it("hides sessions from another agent", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(api.agentSessions.getOrCreate, {
      sessionId: "t3_1",
      agentKind: "top3-issues",
      source: "homepage",
    });
    for (let i = 0; i < 2; i++) {
      await t.mutation(api.agentSessions.appendMessage, {
        sessionId: "t3_1",
        role: "user",
        content: "hi",
      });
    }
    await t
      .withIdentity(VISITOR)
      .mutation(api.agentSessions.bindToAccount, { sessionId: "t3_1" });
    expect(
      await t
        .withIdentity(VISITOR)
        .query(api.agentSessions.portalListUnfinished, {})
    ).toEqual([]);
  });
});
