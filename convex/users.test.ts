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

let savedDomains: string | undefined;

beforeEach(() => {
  savedDomains = process.env.OWNER_EMAIL_DOMAINS;
  process.env.OWNER_EMAIL_DOMAINS = "icodemybusiness.com";
});

afterEach(() => {
  if (savedDomains === undefined) delete process.env.OWNER_EMAIL_DOMAINS;
  else process.env.OWNER_EMAIL_DOMAINS = savedDomains;
});

describe("users.createUser (deprecated shim) cannot escalate", () => {
  it("ignores a client-supplied role", async () => {
    const t = convexTest(schema, modules);

    // The exact call the old client bundle made, with the role weaponised.
    await t.withIdentity(OUTSIDER).mutation(api.users.createUser, {
      clerkUserId: OUTSIDER.subject,
      email: OUTSIDER.email,
      name: "Attacker",
      role: "admin",
    });

    const row = await t.query(api.users.getUserByClerkId, {
      clerkUserId: OUTSIDER.subject,
    });
    expect(row?.role).toBeUndefined();
  });

  it("ignores a client-supplied clerkUserId and email, using the identity instead", async () => {
    const t = convexTest(schema, modules);

    await t.withIdentity(OUTSIDER).mutation(api.users.createUser, {
      clerkUserId: "user_someone_else",
      email: "victim@icodemybusiness.com",
      role: "admin",
    });

    // No row was created for the spoofed id...
    const spoofed = await t.query(api.users.getUserByClerkId, {
      clerkUserId: "user_someone_else",
    });
    expect(spoofed).toBeNull();

    // ...and the caller's own row carries their real, non-owner identity.
    const own = await t.query(api.users.getUserByClerkId, {
      clerkUserId: OUTSIDER.subject,
    });
    expect(own?.email).toBe(OUTSIDER.email);
    expect(own?.role).toBeUndefined();
  });

  it("rejects an unauthenticated caller outright", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.users.createUser, {
        clerkUserId: "user_ghost",
        email: "ghost@icodemybusiness.com",
        role: "admin",
      })
    ).rejects.toThrow(/Unauthorized/);
  });
});

describe("users.ensureCurrentUser", () => {
  it("derives role admin for the owner", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity(OWNER).mutation(api.users.ensureCurrentUser, {
      name: "Matt",
    });

    const row = await t.query(api.users.getUserByClerkId, {
      clerkUserId: OWNER.subject,
    });
    expect(row?.role).toBe("admin");
    expect(row?.email).toBe("matt@icodemybusiness.com");
  });

  it("does not grant admin on an unverified owner-domain address", async () => {
    const t = convexTest(schema, modules);
    await t
      .withIdentity({ ...OWNER, subject: "user_unverified", emailVerified: false })
      .mutation(api.users.ensureCurrentUser, {});

    const row = await t.query(api.users.getUserByClerkId, {
      clerkUserId: "user_unverified",
    });
    expect(row?.role).toBeUndefined();
  });

  it("is idempotent across repeated sign-ins", async () => {
    const t = convexTest(schema, modules);
    const first = await t
      .withIdentity(OWNER)
      .mutation(api.users.ensureCurrentUser, { name: "Matt" });
    const second = await t
      .withIdentity(OWNER)
      .mutation(api.users.ensureCurrentUser, { name: "Matt K" });
    expect(second).toBe(first);

    const row = await t.query(api.users.getUserByClerkId, {
      clerkUserId: OWNER.subject,
    });
    expect(row?.name).toBe("Matt K");
  });
});

describe("users.updateUserProfile", () => {
  it("can only touch the caller's own row", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity(OWNER).mutation(api.users.ensureCurrentUser, {
      name: "Matt",
    });
    await t.withIdentity(OUTSIDER).mutation(api.users.ensureCurrentUser, {
      name: "Attacker",
    });

    await t
      .withIdentity(OUTSIDER)
      .mutation(api.users.updateUserProfile, { name: "Renamed" });

    const ownerRow = await t.query(api.users.getUserByClerkId, {
      clerkUserId: OWNER.subject,
    });
    expect(ownerRow?.name).toBe("Matt");

    const outsiderRow = await t.query(api.users.getUserByClerkId, {
      clerkUserId: OUTSIDER.subject,
    });
    expect(outsiderRow?.name).toBe("Renamed");
  });
});

describe("users.setUserRole", () => {
  it("is refused for a non-owner, even one holding an admin row", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity(OUTSIDER).mutation(api.users.ensureCurrentUser, {});
    // Simulate a row escalated before the fix.
    await t.run(async (ctx) => {
      const row = await ctx.db
        .query("users")
        .withIndex("by_clerkUserId", (q) =>
          q.eq("clerkUserId", OUTSIDER.subject)
        )
        .first();
      if (row) await ctx.db.patch(row._id, { role: "admin" });
    });

    await expect(
      t.withIdentity(OUTSIDER).mutation(api.users.setUserRole, {
        clerkUserId: OUTSIDER.subject,
        role: "admin",
      })
    ).rejects.toThrow(/Forbidden/);
  });

  it("is allowed for the owner", async () => {
    const t = convexTest(schema, modules);
    await t.withIdentity(OWNER).mutation(api.users.ensureCurrentUser, {});
    await t.withIdentity(OUTSIDER).mutation(api.users.ensureCurrentUser, {});

    await t.withIdentity(OWNER).mutation(api.users.setUserRole, {
      clerkUserId: OUTSIDER.subject,
      role: "user",
    });

    const row = await t.query(api.users.getUserByClerkId, {
      clerkUserId: OUTSIDER.subject,
    });
    expect(row?.role).toBe("user");
  });
});
