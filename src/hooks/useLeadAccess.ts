"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useSessionId } from "./useSessionId";

export type LeadAccessStatus = "loading" | "no-access" | "has-access";

export function useLeadAccess(): { status: LeadAccessStatus } {
  const sessionId = useSessionId();

  const lead = useQuery(
    api.leads.getLeadBySessionId,
    sessionId ? { sessionId } : "skip"
  );

  if (lead === undefined) return { status: "loading" };
  if (lead === null) return { status: "no-access" };
  return { status: "has-access" };
}
