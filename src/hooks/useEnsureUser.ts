"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export function useEnsureUser() {
  const { user: clerkUser, isSignedIn } = useUser();
  const ensureCurrentUser = useMutation(api.users.ensureCurrentUser);

  const clerkUserId = clerkUser?.id;
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUserId ? { clerkUserId } : "skip"
  );

  useEffect(() => {
    if (!isSignedIn || !clerkUser || convexUser !== null) return;
    // convexUser is undefined while loading, null means not found
    if (convexUser !== undefined) return;

    // The Clerk user id, email and role are all derived server-side from the
    // verified identity — deliberately not passed from the browser.
    ensureCurrentUser({
      name: clerkUser.fullName ?? undefined,
    }).catch(console.error);
  }, [isSignedIn, clerkUser, convexUser, ensureCurrentUser]);

  return convexUser;
}
