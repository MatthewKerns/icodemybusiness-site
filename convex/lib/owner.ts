/**
 * Owner identification for the operator-only surfaces (/admin/*).
 *
 * This is deliberately env-driven and derived from the *verified Clerk identity*
 * — never from the `users.role` column, which was historically writable by any
 * unauthenticated client (see the note on `createUser` in convex/users.ts).
 *
 * MIRRORED in src/lib/owner.ts for the Next.js side. Convex and src/ have
 * separate tsconfigs and bundlers, so the predicate is duplicated rather than
 * imported. Keep the two in sync; both have the same unit-test matrix.
 */

/** Parse a comma-separated env allowlist into lowercase entries. */
function list(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export interface OwnerEnv {
  /** OWNER_EMAIL_DOMAINS — e.g. "icodemybusiness.com" */
  domains?: string;
  /** OWNER_EMAILS — exact-address allowlist */
  emails?: string;
  /** OWNER_CLERK_USER_IDS — fallback that works before the JWT email claim exists */
  userIds?: string;
}

export function ownerEnvFromProcess(): OwnerEnv {
  return {
    domains: process.env.OWNER_EMAIL_DOMAINS,
    emails: process.env.OWNER_EMAILS,
    userIds: process.env.OWNER_CLERK_USER_IDS,
  };
}

/**
 * Is this identity the operator?
 *
 * Order matters: the Clerk-user-id allowlist is checked FIRST so a misconfigured
 * (or not-yet-configured) JWT template cannot lock the owner out of their own
 * dashboard.
 *
 * An unverified email never qualifies — Clerk lets any user attach an arbitrary
 * address to their account, so without the verified check anyone could claim an
 * @icodemybusiness.com address and walk in.
 */
export function isOwnerIdentity(
  email: string | undefined | null,
  emailVerified: boolean | undefined,
  clerkUserId: string | undefined | null,
  env: OwnerEnv
): boolean {
  const userId = (clerkUserId ?? "").trim().toLowerCase();
  if (userId && list(env.userIds).includes(userId)) return true;

  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) return false;
  // `undefined` means the claim is absent (older JWT template); only an explicit
  // `false` is a positive signal that the address is unverified.
  if (emailVerified === false) return false;

  if (list(env.emails).includes(normalized)) return true;

  const at = normalized.lastIndexOf("@");
  if (at === -1) return false;
  const domain = normalized.slice(at + 1);
  return domain !== "" && list(env.domains).includes(domain);
}

/** True when no owner allowlist is configured at all — the gate denies everyone. */
export function ownerEnvIsEmpty(env: OwnerEnv): boolean {
  return (
    list(env.domains).length === 0 &&
    list(env.emails).length === 0 &&
    list(env.userIds).length === 0
  );
}
