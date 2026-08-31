import { mutation, query, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { requireOwner } from "./lib/auth";
import { isOwnerIdentity, ownerEnvFromProcess } from "./lib/owner";

/**
 * Upsert the signed-in user's own row. Everything identifying — the Clerk user
 * id, the email, and the role — is derived from the verified JWT identity and is
 * never accepted from the caller.
 */
async function upsertCurrentUser(
  ctx: MutationCtx,
  args: { name?: string; source?: string }
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Unauthorized");
  }

  const clerkUserId = identity.subject;
  const email = (identity.email ?? "").trim().toLowerCase();
  // Role is DERIVED server-side from the identity, never supplied by the client.
  const role = isOwnerIdentity(
    identity.email,
    identity.emailVerified,
    clerkUserId,
    ownerEnvFromProcess()
  )
    ? "admin"
    : undefined;

  const existing = await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
    .first();

  if (existing) {
    const patch: { email?: string; name?: string; role?: string } = {};
    // Clerk is the system of record for the email address.
    if (email && existing.email !== email) patch.email = email;
    if (args.name !== undefined && existing.name !== args.name) patch.name = args.name;
    if (role && existing.role !== role) patch.role = role;
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existing._id, patch);
    }
    return existing._id;
  }

  return await ctx.db.insert("users", {
    clerkUserId,
    email,
    name: args.name,
    role,
    source: args.source,
    createdAt: Date.now(),
  });
}

/**
 * Create-or-update the signed-in user's own record. Called on sign-in by
 * `useEnsureUser`.
 */
export const ensureCurrentUser = mutation({
  args: {
    name: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await upsertCurrentUser(ctx, args);
  },
});

/**
 * DEPRECATED — replaced by `ensureCurrentUser`. Remove once no cached client
 * bundle can still call it (Convex rejects unknown args, so deleting this while
 * an old bundle is in a browser tab would hard-fail that user's sign-in).
 *
 * The arg validator is unchanged for that compatibility, but `clerkUserId`,
 * `email` and `role` are IGNORED: accepting them from an unauthenticated caller
 * was a privilege-escalation hole (anyone could insert a `role: "admin"` row).
 */
export const createUser = mutation({
  args: v.object({
    clerkUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    source: v.optional(v.string()),
    role: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    return await upsertCurrentUser(ctx, { name: args.name, source: args.source });
  },
});

export const getUserByClerkId = query({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();
  },
});

export const setUserRole = mutation({
  args: {
    clerkUserId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    // Owner-gated rather than role-gated: an already-escalated row must not be
    // able to mint more admins.
    await requireOwner(ctx);

    const target = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .first();

    if (!target) {
      throw new ConvexError("User not found");
    }

    await ctx.db.patch(target._id, { role: args.role });
    return target._id;
  },
});

/**
 * Update your own profile. `clerkUserId` and `email` are no longer accepted —
 * the target is derived from the identity, and Clerk owns the email address.
 */
export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthorized");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      throw new ConvexError("User not found");
    }

    if (args.name !== undefined) {
      await ctx.db.patch(user._id, { name: args.name });
    }
    return user._id;
  },
});

/**
 * One-shot audit: list every `role: "admin"` row whose identity does NOT satisfy
 * the owner allowlist. These are rows that may have been created through the old
 * unauthenticated `createUser` hole. Reports only — clear them by hand from the
 * Convex dashboard after reviewing.
 *
 *   npx convex run users:auditAdminRows
 */
export const auditAdminRows = internalMutation({
  args: {},
  handler: async (ctx) => {
    const env = ownerEnvFromProcess();
    const admins = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId")
      .take(1000);

    const suspicious = admins
      .filter((user) => user.role === "admin")
      // `emailVerified` is not stored on the row; treat a stored email as
      // unverified-unknown and rely on the allowlist alone.
      .filter((user) => !isOwnerIdentity(user.email, undefined, user.clerkUserId, env))
      .map((user) => ({
        _id: user._id,
        clerkUserId: user.clerkUserId,
        email: user.email,
        createdAt: user.createdAt,
      }));

    return { checked: admins.length, suspicious };
  },
});
