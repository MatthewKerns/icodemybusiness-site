import * as Sentry from "@sentry/nextjs";
import { initPostHog } from "@/lib/posthog";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration()],
});

// PostHog product analytics — initialized at startup (recommended over a
// useEffect in a provider). The PostHogProvider then handles pageviews + identify.
initPostHog();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
