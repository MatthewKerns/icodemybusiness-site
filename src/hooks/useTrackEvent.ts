"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import posthog from "posthog-js";
import { api } from "../../convex/_generated/api";
import { useSessionId } from "./useSessionId";
import { useAttribution } from "./useAttribution";
import type { AnalyticsEvent } from "@/lib/analytics-events";

export type EventCategory = "click" | "decision" | "form" | "system";

export type TrackEvent = (
  name: AnalyticsEvent,
  props?: Record<string, unknown>,
  category?: EventCategory
) => void;

/**
 * Returns a `track(name, props?, category?)` function that dual-writes a visitor
 * event to:
 *   1. Convex `visitorEvents` — the durable system of record an admin reviews.
 *   2. PostHog — for funnel analysis (no-op when PostHog isn't loaded).
 *
 * Session id, Clerk user id, page, and attribution are attached automatically so
 * call sites only supply the event-specific detail. Fire-and-forget: tracking
 * failures are swallowed and never surfaced to the visitor.
 */
export function useTrackEvent(): TrackEvent {
  const pathname = usePathname();
  const trackMutation = useMutation(api.visitorEvents.track);
  const { userId } = useAuth();
  const sessionId = useSessionId();
  const { source, variant } = useAttribution();

  return useCallback(
    (name, props, category = "click") => {
      // PostHog (funnels) — no-op if the SDK isn't loaded.
      if (typeof window !== "undefined" && posthog.__loaded) {
        posthog.capture(name, { category, ...props });
      }

      // Convex (durable system of record) — best effort.
      void trackMutation({
        name,
        category,
        sessionId: sessionId ?? undefined,
        clerkUserId: userId ?? undefined,
        page: pathname ?? undefined,
        props,
        source: source ?? undefined,
        variant: variant ?? undefined,
      }).catch(() => {
        // Never surface tracking errors to the visitor.
      });
    },
    [trackMutation, pathname, userId, sessionId, source, variant]
  );
}
