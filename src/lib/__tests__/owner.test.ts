import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isOwnerEmail, isOwnerUserId } from "@/lib/owner";
import { isOwnerIdentity, ownerEnvIsEmpty } from "../../../convex/lib/owner";

const OWNER_ENV_KEYS = [
  "OWNER_EMAIL_DOMAINS",
  "OWNER_EMAILS",
  "OWNER_CLERK_USER_IDS",
] as const;

const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of OWNER_ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of OWNER_ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

// The Next-side (src/lib/owner.ts) and Convex-side (convex/lib/owner.ts)
// predicates are intentional mirrors. Both are exercised with the same matrix so
// they cannot drift apart silently.
describe("owner allowlist", () => {
  describe("domain matching", () => {
    beforeEach(() => {
      process.env.OWNER_EMAIL_DOMAINS = "icodemybusiness.com";
    });

    it("accepts an address on the business domain", () => {
      expect(isOwnerEmail("matt@icodemybusiness.com")).toBe(true);
      expect(
        isOwnerIdentity("matt@icodemybusiness.com", true, "user_1", {
          domains: "icodemybusiness.com",
        })
      ).toBe(true);
    });

    it("normalizes case and surrounding whitespace", () => {
      expect(isOwnerEmail("  Matt@iCodeMyBusiness.COM ")).toBe(true);
      expect(
        isOwnerIdentity("  Matt@iCodeMyBusiness.COM ", true, "user_1", {
          domains: "ICodeMyBusiness.com",
        })
      ).toBe(true);
    });

    it("rejects a lookalike domain that merely contains the real one", () => {
      // The check must be an exact domain match, not a suffix match on the
      // whole address — otherwise icodemybusiness.com.evil.co walks in.
      expect(isOwnerEmail("attacker@icodemybusiness.com.evil.co")).toBe(false);
      expect(isOwnerEmail("attacker@evil-icodemybusiness.com")).toBe(false);
      expect(
        isOwnerIdentity("attacker@icodemybusiness.com.evil.co", true, "user_2", {
          domains: "icodemybusiness.com",
        })
      ).toBe(false);
    });

    it("rejects an address that only contains the domain in its local part", () => {
      expect(isOwnerEmail("icodemybusiness.com@gmail.com")).toBe(false);
    });

    it("rejects another domain", () => {
      expect(isOwnerEmail("someone@gmail.com")).toBe(false);
    });
  });

  it("accepts an exact address from OWNER_EMAILS regardless of domain", () => {
    process.env.OWNER_EMAILS = "matt@personal-domain.dev";
    expect(isOwnerEmail("matt@personal-domain.dev")).toBe(true);
    expect(isOwnerEmail("other@personal-domain.dev")).toBe(false);
  });

  it("denies everyone when no allowlist is configured", () => {
    expect(isOwnerEmail("matt@icodemybusiness.com")).toBe(false);
    expect(isOwnerUserId("user_1")).toBe(false);
    expect(
      isOwnerIdentity("matt@icodemybusiness.com", true, "user_1", {})
    ).toBe(false);
    expect(ownerEnvIsEmpty({})).toBe(true);
    expect(ownerEnvIsEmpty({ domains: "icodemybusiness.com" })).toBe(false);
  });

  it("rejects empty and malformed addresses", () => {
    process.env.OWNER_EMAIL_DOMAINS = "icodemybusiness.com";
    expect(isOwnerEmail(undefined)).toBe(false);
    expect(isOwnerEmail(null)).toBe(false);
    expect(isOwnerEmail("")).toBe(false);
    expect(isOwnerEmail("no-at-sign")).toBe(false);
    expect(isOwnerEmail("trailing@")).toBe(false);
  });

  describe("Clerk user id fallback", () => {
    it("matches an allowlisted id", () => {
      process.env.OWNER_CLERK_USER_IDS = "user_abc, user_def";
      expect(isOwnerUserId("user_abc")).toBe(true);
      expect(isOwnerUserId("user_def")).toBe(true);
      expect(isOwnerUserId("user_xyz")).toBe(false);
    });

    it("lets the owner in even with no email claim at all", () => {
      // This is the anti-lockout path: it must work before the Clerk JWT
      // template has been given an email claim.
      expect(
        isOwnerIdentity(undefined, undefined, "user_abc", { userIds: "user_abc" })
      ).toBe(true);
    });
  });

  describe("email verification", () => {
    it("rejects an explicitly unverified business address", () => {
      // Clerk lets any user attach an arbitrary address to their own account,
      // so an unverified match must never satisfy the gate.
      expect(
        isOwnerIdentity("matt@icodemybusiness.com", false, "user_9", {
          domains: "icodemybusiness.com",
        })
      ).toBe(false);
    });

    it("allows an absent verification claim (older JWT template)", () => {
      expect(
        isOwnerIdentity("matt@icodemybusiness.com", undefined, "user_9", {
          domains: "icodemybusiness.com",
        })
      ).toBe(true);
    });
  });
});
