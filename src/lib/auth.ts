import { convex } from "@/lib/convex-client";
import { api } from "../../convex/_generated/api";

export type UserRole = "admin" | "user";

export async function hasRole(
  clerkUserId: string,
  role: UserRole
): Promise<boolean> {
  // Bootstrap fallback: env var admin always passes
  if (role === "admin" && process.env.ADMIN_CLERK_USER_ID === clerkUserId) {
    return true;
  }
  // Query Convex users table for role
  const user = await convex.query(api.users.getUserByClerkId, { clerkUserId });
  return (user?.role ?? "user") === role;
}

export async function isAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, "admin");
}
