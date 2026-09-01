import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import { Doc } from "../_generated/dataModel";
import { isOwnerIdentity, ownerEnvFromProcess, ownerEnvIsEmpty } from "./owner";

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
  // The operator is always an admin, established from the JWT rather than from
  // the (previously client-writable) `users.role` column.
  if (role === "admin" && (await isOwner(ctx))) return true;

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
  // The operator satisfies "admin" via the JWT, not via `users.role`.
  if (role === "admin" && (await isOwner(ctx))) {
    return user;
  }
  if (effectiveRole(user) !== role) {
    throw new ConvexError("Forbidden");
  }
  return user;
}

/**
 * Owner gate for the operator-only dashboard.
 *
 * Unlike `requireRole`, this derives authorization entirely from the verified
 * Clerk identity in the JWT — it never reads `users.role`, which is why it is
 * safe even though that column was historically client-writable.
 *
 * Requires the Clerk JWT template named "convex" to include an `email` claim
 * (and ideally `email_verified`). `OWNER_CLERK_USER_IDS` is checked first as a
 * fallback so a missing claim cannot lock the owner out.
 */
export async function requireOwner(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<{ clerkUserId: string; email: string }> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthorized");
  }

  const env = ownerEnvFromProcess();
  if (isOwnerIdentity(identity.email, identity.emailVerified, identity.subject, env)) {
    return {
      clerkUserId: identity.subject,
      email: (identity.email ?? "").trim().toLowerCase(),
    };
  }

  // Distinguish "misconfigured" from "not you" — being locked out of your own
  // dashboard by a missing JWT claim is otherwise very hard to diagnose.
  if (!identity.email && !env.userIds) {
    throw new ConvexError(
      'Owner check unavailable: the Clerk JWT template "convex" is missing the "email" claim. ' +
        'Add {"email": "{{user.primary_email_address}}"} to it (Clerk Dashboard -> JWT Templates -> convex), ' +
        "or set OWNER_CLERK_USER_IDS in the Convex env as a fallback, then sign out and back in."
    );
  }
  if (ownerEnvIsEmpty(env)) {
    throw new ConvexError(
      "Owner check unavailable: no owner allowlist is configured. Set OWNER_EMAIL_DOMAINS " +
        "(and/or OWNER_EMAILS, OWNER_CLERK_USER_IDS) in the Convex deployment env."
    );
  }

  throw new ConvexError("Forbidden");
}

/** Non-throwing owner check, for callers that want to branch rather than fail. */
export async function isOwner(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<boolean> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return false;
  return isOwnerIdentity(
    identity.email,
    identity.emailVerified,
    identity.subject,
    ownerEnvFromProcess()
  );
}
