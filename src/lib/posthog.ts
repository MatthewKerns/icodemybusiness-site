import posthog from "posthog-js";

/**
 * Client-side PostHog initialization.
 *
 * Called once at app startup from `src/instrumentation-client.ts`. Idempotent —
 * the `__loaded` guard makes repeat calls a no-op.
 *
 * Events go straight to PostHog US cloud, in the open. They used to
 * route through a same-origin `/ingest` reverse proxy whose stated purpose was
 * to stop ad/tracking blockers dropping them; that proxy was removed because a
 * first-party tunnel for a third-party tracker reads as evasive to the ISP
 * security products that block this domain (docs/trust-pages.md). Losing some
 * events to blockers is the accepted cost.
 *
 * Only an absolute URL is honoured for NEXT_PUBLIC_POSTHOG_HOST: a relative
 * value such as a leftover "/ingest" would now point at a route that 404s and
 * silently drop every event, and an empty build arg would yield an empty host.
 */
const POSTHOG_US_HOST = "https://us.i.posthog.com";

export function resolveClientHost(configured: string | undefined): string {
  return configured && /^https?:\/\//.test(configured) ? configured : POSTHOG_US_HOST;
}

export function initPostHog() {
  if (
    typeof window === "undefined" ||
    !process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    posthog.__loaded
  ) {
    return posthog;
  }

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: resolveClientHost(process.env.NEXT_PUBLIC_POSTHOG_HOST),
    ui_host: "https://us.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // captured manually in PostHogProvider
    capture_pageleave: true, // bounce rate / time-on-page accuracy
    capture_exceptions: true, // surface client-side errors on the ops dashboard
  });

  return posthog;
}
