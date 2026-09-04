"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import {
  readDiscoverySessionId,
  subscribeDiscoverySessionId,
} from "@/lib/agent/discovery-session-id";

/**
 * Attach the conversation in this tab to the account that just signed in.
 *
 * Mounted globally rather than inside DiscoveryAssessment, because the portal
 * bounces a signed-out visitor to /sign-in and returns them to /portal/* — where
 * the assessment component is not mounted, and where an unbound conversation
 * would be invisible forever.
 *
 * Not folded into `useEnsureUser` either: that bails once a `users` row exists,
 * so it fires only on a visitor's first ever sign-in and never on a return.
 *
 * Costs nothing for anyone who has not opened the assessment in this tab — with
 * no stored id the query is skipped, so there is no subscription and no write.
 */
const attempted = new Set<string>();

export function useBindDiscoverySession(): void {
  const { isSignedIn, userId } = useAuth();
  const bind = useMutation(api.agentSessions.bindToAccount);
  const track = useTrackEvent();

  const sessionId = useSyncExternalStore(
    subscribeDiscoverySessionId,
    readDiscoverySessionId,
    // The server snapshot must be null: reading sessionStorage during SSR
    // throws, and returning anything else here is a hydration mismatch.
    () => null
  );

  const status = useQuery(
    api.agentSessions.bindStatus,
    isSignedIn && sessionId ? { sessionId } : "skip"
  );

  useEffect(() => {
    if (!isSignedIn || !userId || !sessionId) return;
    // undefined = still loading, null = signed out. Neither is "no row".
    if (!status) return;
    // `exists` flips when the assessment component inserts the row, which is
    // what lets this run whichever order the two happen in.
    if (!status.exists || status.boundToMe || status.boundToOther) return;

    const key = `${userId}:${sessionId}`;
    if (attempted.has(key)) return;
    attempted.add(key);

    void bind({ sessionId })
      .then(() => track(ANALYTICS_EVENTS.DISCOVERY_SESSION_BOUND, {}, "system"))
      .catch(() => {
        // Deliberately leaves the key set. A refusal here is a server-side
        // decision about ownership and will not change on a retry; clearing it
        // would re-fire on every status change.
      });
  }, [isSignedIn, userId, sessionId, status, bind, track]);
}
