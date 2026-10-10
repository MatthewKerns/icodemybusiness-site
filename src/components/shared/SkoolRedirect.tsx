"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { SKOOL_COMMUNITY_URL } from "@/lib/constants";

/**
 * How long /skool stays on screen before forwarding. Long enough for the
 * PostHog event (sent by beacon) and the Meta Pixel's PageView — whose script
 * loads after hydration — to leave the browser; short enough to read as a hop.
 */
export const SKOOL_REDIRECT_DELAY_MS = 1000;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

/** The UTM tags on the current URL, so the event says where the click came from. */
export function utmProperties(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const props: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) props[key] = value;
  }
  return props;
}

/**
 * The branded hop to the Skool community. Skool can't tell us which bio or
 * video a member came from, so off-site links point here with UTM tags; this
 * logs the visit in PostHog (and the Meta Pixel sees /skool as a PageView via
 * MetaPixel in Providers), then forwards to Skool.
 */
export function SkoolRedirect() {
  useEffect(() => {
    if (posthog.__loaded) {
      posthog.capture(
        ANALYTICS_EVENTS.SKOOL_REDIRECT,
        { destination: SKOOL_COMMUNITY_URL, ...utmProperties(window.location.search) },
        { transport: "sendBeacon" }
      );
    }
    const timer = window.setTimeout(() => {
      window.location.replace(SKOOL_COMMUNITY_URL);
    }, SKOOL_REDIRECT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-text-muted">Taking you to the community on Skool…</p>
      <a
        href={SKOOL_COMMUNITY_URL}
        className="mt-5 inline-flex h-12 items-center gap-2 rounded-lg bg-gold px-6 font-medium text-black"
      >
        Continue to Skool
        <span aria-hidden="true">&rarr;</span>
      </a>
    </section>
  );
}
