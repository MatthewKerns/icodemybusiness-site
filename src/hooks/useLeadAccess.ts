"use client";

import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { useSessionId } from "./useSessionId";

export type LeadAccessStatus = "loading" | "no-access" | "has-access";

export function useLeadAccess(): { status: LeadAccessStatus } {
  const sessionId = useSessionId();
  const { user, isSignedIn, isLoaded: clerkLoaded } = useUser();
  const clerkUserId = isSignedIn ? user?.id : undefined;

  // When signed in, key access on the stable Clerk user id — the browser
  // session id is ephemeral (changes across devices / cleared storage), so a
  // returning user with an existing lead would otherwise never match. Anonymous
  // visitors fall back to the session id.
  const leadByUser = useQuery(
    api.leads.getLeadByClerkUserId,
    clerkUserId ? { clerkUserId } : "skip"
  );
  const leadBySession = useQuery(
    api.leads.getLeadBySessionId,
    !clerkUserId && sessionId ? { sessionId } : "skip"
  );

  if (!clerkLoaded) return { status: "loading" };

  const lead = clerkUserId ? leadByUser : leadBySession;
  if (lead === undefined) return { status: "loading" };
  return { status: lead ? "has-access" : "no-access" };
}
