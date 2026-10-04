"use client";

import posthog from "posthog-js";
import { ANALYTICS_EVENTS } from "./analytics-events";
import { META_STANDARD_EVENTS, trackMeta } from "./meta-pixel";

/**
 * Client-side product-analytics helpers.
 *
 * Thin, typed wrappers over `posthog.capture` for the business events we care
 * about. Each call is a no-op when PostHog isn't loaded (missing key, blocked,
 * or SSR), so callers never need to guard. Event names come from the shared
 * taxonomy in `analytics-events.ts`. The two Tier 1 conversions also go to the
 * Meta Pixel as standard events, independently of whether PostHog loaded.
 */

function capture(event: string, properties?: Record<string, unknown>): void {
  if (typeof window === "undefined" || !posthog.__loaded) return;
  posthog.capture(event, properties);
}

export const analytics = {
  /** Tier 1 — a lead/email was captured. `source` identifies the surface. */
  leadCaptured(source: string, properties?: Record<string, unknown>) {
    capture(ANALYTICS_EVENTS.LEAD_CAPTURED, { source, ...properties });
    trackMeta(META_STANDARD_EVENTS.LEAD);
  },

  /** Tier 1 — a free consultation was booked (Calendly). */
  consultationBooked(properties?: Record<string, unknown>) {
    capture(ANALYTICS_EVENTS.CONSULTATION_BOOKED, properties);
    trackMeta(META_STANDARD_EVENTS.SCHEDULE);
  },

  /** Tier 2 — visitor unlocked the free tools. */
  freeToolAccessed(properties?: Record<string, unknown>) {
    capture(ANALYTICS_EVENTS.FREE_TOOL_ACCESSED, properties);
  },

  /** Tier 2 — Retell voice chat connected. */
  voiceCallStarted(properties?: Record<string, unknown>) {
    capture(ANALYTICS_EVENTS.VOICE_CALL_STARTED, properties);
  },
} as const;
