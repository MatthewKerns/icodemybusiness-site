import posthog from "posthog-js";

/**
 * Client-side PostHog initialization.
 *
 * Called once at app startup from `src/instrumentation-client.ts`. Idempotent —
 * the `__loaded` guard makes repeat calls a no-op.
 *
 * Events route through the same-origin `/ingest` reverse proxy (configured in
 * next.config.js) by default so ad/tracking blockers don't drop them. Setting
 * NEXT_PUBLIC_POSTHOG_HOST to an absolute URL (e.g. https://eu.i.posthog.com)
 * bypasses the proxy and sends directly.
 */
export function initPostHog() {
  if (
    typeof window === "undefined" ||
    !process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    posthog.__loaded
  ) {
    return posthog;
  }

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "/ingest",
    ui_host: "https://eu.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false, // captured manually in PostHogProvider
    capture_pageleave: true, // bounce rate / time-on-page accuracy
    capture_exceptions: true, // surface client-side errors on the ops dashboard
  });

  return posthog;
}
