import { PostHog } from "posthog-node";
import { ANALYTICS_EVENTS } from "./analytics-events";

/**
 * Server-side PostHog capture (posthog-node) for events that are only known on
 * the backend — Stripe webhooks, checkout creation, Top 3 completion, Retell,
 * and API errors. Sends to PostHog EU cloud (project 206048).
 *
 * Unlike the browser client, the server can't use the same-origin `/ingest`
 * proxy, so it always targets the direct host. Capture is fire-and-forget
 * (`flushAt: 1` pushes promptly on this long-running Node server) and wrapped
 * so analytics can never break a request. Use `flushServerAnalytics()` on
 * critical paths (e.g. webhooks) to guarantee delivery before responding.
 */

let _client: PostHog | null = null;

/** Resolve the ingestion host. The client uses "/ingest"; the server needs an absolute URL. */
function resolveHost(): string {
  const envHost = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (envHost && /^https?:\/\//.test(envHost)) return envHost;
  return "https://eu.i.posthog.com";
}

function getClient(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;
  if (!_client) {
    _client = new PostHog(key, {
      host: resolveHost(),
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return _client;
}

interface ServerEventArgs {
  /** Stable id for the person — Clerk userId for known users, else email/sessionId. */
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}

/** Capture a server-side event. No-op when PostHog isn't configured. */
export function captureServerEvent({
  distinctId,
  event,
  properties,
}: ServerEventArgs): void {
  const client = getClient();
  if (!client) return;
  try {
    client.capture({
      distinctId,
      event,
      properties: { ...properties, $lib: "posthog-node", source: "server" },
    });
  } catch {
    // Analytics must never break the request path.
  }
}

/**
 * Capture an operational API error for the ops dashboard.
 * Mirrors the Sentry capture in `errorResponse` but lands in PostHog so error
 * volume sits alongside the business metrics.
 */
export function captureServerError(args: {
  route?: string;
  code?: string;
  statusCode: number;
  message: string;
  distinctId?: string;
}): void {
  captureServerEvent({
    distinctId: args.distinctId ?? "server",
    event: ANALYTICS_EVENTS.API_ERROR,
    properties: {
      route: args.route,
      code: args.code,
      status_code: args.statusCode,
      message: args.message,
    },
  });
}

/** Flush pending events. Await on critical paths (webhooks) before responding. */
export async function flushServerAnalytics(): Promise<void> {
  const client = getClient();
  if (!client) return;
  try {
    await client.flush();
  } catch {
    // Best-effort.
  }
}
