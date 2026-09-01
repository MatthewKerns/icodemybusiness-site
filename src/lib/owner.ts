/**
 * Owner identification for the Next.js side (middleware + server routes).
 *
 * MIRRORED from convex/lib/owner.ts — Convex and src/ have separate tsconfigs
 * and bundlers, so the predicate is duplicated rather than imported. Keep the
 * two in sync; both have the same unit-test matrix.
 *
 * These env vars are intentionally NOT NEXT_PUBLIC_*: an owner allowlist inlined
 * into the client bundle would be a disclosure, and the gate must not be
 * client-readable in any case.
 */

function list(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** Does this email belong to the operator? Callers must have verified it first. */
export function isOwnerEmail(email: string | undefined | null): boolean {
  const normalized = (email ?? "").trim().toLowerCase();
  if (!normalized) return false;

  if (list(process.env.OWNER_EMAILS).includes(normalized)) return true;

  const at = normalized.lastIndexOf("@");
  if (at === -1) return false;
  const domain = normalized.slice(at + 1);
  return domain !== "" && list(process.env.OWNER_EMAIL_DOMAINS).includes(domain);
}

/**
 * Clerk-user-id fallback. Checked before the email so a missing or misconfigured
 * JWT/session claim cannot lock the operator out of their own dashboard.
 */
export function isOwnerUserId(clerkUserId: string | undefined | null): boolean {
  const normalized = (clerkUserId ?? "").trim().toLowerCase();
  if (!normalized) return false;
  return list(process.env.OWNER_CLERK_USER_IDS).includes(normalized);
}
