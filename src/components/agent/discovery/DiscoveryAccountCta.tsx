"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { BookmarkCheck, UserPlus } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";

/**
 * Keep-this-report affordance on the result screen.
 *
 * Signed out: offer a free account, returning to the assessment afterwards.
 * The session id lives in sessionStorage, which survives Clerk's redirect in
 * the same tab, so the report is found again on return and claimed below.
 *
 * Signed in and unclaimed: bind the report to the account once. The user id
 * is derived server-side from the verified identity, never sent from here.
 */
export function DiscoveryAccountCta({
  sessionId,
  claimed,
  returnPath,
}: {
  sessionId: string;
  claimed: boolean;
  returnPath: string;
}) {
  const { isSignedIn, isLoaded } = useUser();
  const claim = useMutation(api.discoveryAssessments.claim);
  const track = useTrackEvent();
  const claimedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || claimed || claimedRef.current || !sessionId) {
      return;
    }
    claimedRef.current = true;
    void claim({ sessionId })
      .then(() => {
        track(ANALYTICS_EVENTS.DISCOVERY_ACCOUNT_CLAIMED, {}, "system");
      })
      .catch(() => {
        // Claiming is a convenience; a failure must not break the result screen.
        claimedRef.current = false;
      });
  }, [isLoaded, isSignedIn, claimed, sessionId, claim, track]);

  if (!isLoaded) return null;

  if (isSignedIn || claimed) {
    return (
      <p className="flex items-center gap-2 text-sm text-text-muted">
        <BookmarkCheck className="h-4 w-4 text-gold" aria-hidden="true" />
        Saved to your account. It&apos;s in the portal whenever you want it.
      </p>
    );
  }

  const href = `/sign-up?redirect_url=${encodeURIComponent(
    typeof window !== "undefined"
      ? `${window.location.origin}${returnPath}`
      : returnPath
  )}`;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-text-muted">
        Want to come back to this? A free account keeps the report in one place
        and means we both start the call from the same page.
      </p>
      <a
        href={href}
        className={cn(
          "inline-flex w-fit items-center gap-2 rounded-md border border-border px-4 py-2",
          "text-sm font-medium text-text-primary transition-colors duration-300 hover:border-gold-dim",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light"
        )}
      >
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        Create a free account to keep this report
      </a>
    </div>
  );
}
