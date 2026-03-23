import { QueryCtx, MutationCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import { Doc } from "../_generated/dataModel";

export type UserRole = "admin" | "user";

/**
 * Returns the authenticated user record from the DB, or `null` if not found / not signed in.
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  // identity.subject is the Clerk user ID (from Convex-Clerk JWT integration)
  return await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
    .first();
}

/**
 * Returns the effective role for a user record. Undefined role defaults to "user".
 */
function effectiveRole(user: Doc<"users">): UserRole {
  return (user.role as UserRole) ?? "user";
}

/**
 * Non-throwing boolean check: does the caller have the given role?
 */
export async function hasRole(
  ctx: QueryCtx | MutationCtx,
  role: UserRole
): Promise<boolean> {
  const user = await getAuthenticatedUser(ctx);
  if (!user) return false;
  return effectiveRole(user) === role;
}

/**
 * Throws ConvexError("Forbidden") if the caller doesn't have the required role.
 * Returns the user record on success.
 */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  role: UserRole
): Promise<Doc<"users">> {
  const user = await getAuthenticatedUser(ctx);
  if (!user) {
    throw new ConvexError("Unauthorized");
  }
  if (effectiveRole(user) !== role) {
    throw new ConvexError("Forbidden");
  }
  return user;
}
