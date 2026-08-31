import { clerkClient } from "@clerk/nextjs/server";
import { isOwnerEmail } from "@/lib/owner";

/**
 * Fallback owner check via the Clerk API, used only when the session token has
 * no `email` claim (i.e. before Clerk Dashboard -> Sessions -> "Customize
 * session token" has been given {"email": "{{user.primary_email_address}}"}).
 *
 * Memoized because middleware runs on every matched request. Same in-memory,
 * per-instance approach as src/lib/webhook-rate-limit.ts — good enough for a
 * single-operator allowlist, and it fails closed on error.
 */
const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 500;

const cache = new Map<string, { ok: boolean; at: number }>();

export async function isOwnerByApiLookup(clerkUserId: string): Promise<boolean> {
  const now = Date.now();
  const hit = cache.get(clerkUserId);
  if (hit && now - hit.at < TTL_MS) return hit.ok;

  let ok = false;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(clerkUserId);
    const primary = user.emailAddresses.find(
      (address) => address.id === user.primaryEmailAddressId
    );
    // Only a Clerk-verified address counts: a user can attach any address they
    // like to their own account.
    const verified = primary?.verification?.status === "verified";
    ok = verified && isOwnerEmail(primary?.emailAddress);
  } catch (error) {
    console.error("Owner lookup failed:", error);
    ok = false;
  }

  if (cache.size >= MAX_ENTRIES) cache.clear();
  cache.set(clerkUserId, { ok, at: now });
  return ok;
}
