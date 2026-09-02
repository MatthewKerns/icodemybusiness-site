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
    if (!isSignedIn || !clerkUser) return;

    // `useQuery` returns undefined while the query is in flight and null once it
    // has resolved to nothing. Only the second means "no record exists yet".
    //
    // These were previously two separate guards — one requiring null, the next
    // requiring undefined — which no single value can satisfy, so the mutation
    // below never ran. Every signed-in visitor went unrecorded (R-010).
    if (convexUser !== null) return;

    // The Clerk user id, email and role are all derived server-side from the
    // verified identity — deliberately not passed from the browser.
    ensureCurrentUser({
      name: clerkUser.fullName ?? undefined,
    }).catch(console.error);
  }, [isSignedIn, clerkUser, convexUser, ensureCurrentUser]);

  return convexUser;
}
