"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useEnsureUser() {
  const { user: clerkUser, isSignedIn } = useUser();
  const createUser = useMutation(api.users.createUser);

  const clerkUserId = clerkUser?.id;
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUserId ? { clerkUserId } : "skip"
  );

  useEffect(() => {
    if (!isSignedIn || !clerkUser || convexUser !== null) return;
    // convexUser is undefined while loading, null means not found
    if (convexUser !== undefined) return;

    const adminId = process.env.NEXT_PUBLIC_ADMIN_CLERK_USER_ID;
    void createUser({
      clerkUserId: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? "",
      name: clerkUser.fullName ?? undefined,
      role: adminId && clerkUser.id === adminId ? "admin" : undefined,
    });
  }, [isSignedIn, clerkUser, convexUser, createUser]);

  return convexUser;
}
