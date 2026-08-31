import { convex } from "@/lib/convex-client";
import { api } from "../../convex/_generated/api";
import { isOwnerEmail, isOwnerUserId } from "@/lib/owner";
import { isOwnerByApiLookup } from "@/lib/owner-lookup";

export type UserRole = "admin" | "user";

export async function hasRole(
  clerkUserId: string,
  role: UserRole
): Promise<boolean> {
  if (role === "admin") return isAdmin(clerkUserId);
  const user = await convex.query(api.users.getUserByClerkId, { clerkUserId });
  return (user?.role ?? "user") === role;
}

/**
 * Admin === the operator. Established from the Clerk identity (allowlisted user
 * id, or a Clerk-verified business-domain email), never from the `users.role`
 * column, which was historically writable by any unauthenticated client.
 *
 * Used by the admin API routes; middleware has its own copy of this check that
 * can read the session claim directly without a Clerk API round-trip.
 */
export async function isAdmin(clerkUserId: string): Promise<boolean> {
  if (isOwnerUserId(clerkUserId)) return true;
  return await isOwnerByApiLookup(clerkUserId);
}

/** Exported for callers that already have a verified email in hand. */
export { isOwnerEmail };
