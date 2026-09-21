import type { HeaderReader } from "@/lib/navigation-kind";

/**
 * Is this request for the staging host?
 *
 * staging.icodemybusiness.com is served by the SAME container and build as the
 * apex. A byte-identical public copy of a site on a second host is a cloned-site
 * signal to a reputation scanner, and this domain is blocked by Comcast and Cox
 * Advanced Security (ticket IH270482834; docs/trust-pages.md). Removing the
 * staging route in Traefik is NOT an option: one container carries both routers
 * and they share a service label, and on 2026-09-05 recreating it with only the
 * staging label took the live apex down. So the block lives here, in the app.
 *
 * X-Forwarded-Host wins over Host because the app runs behind Traefik. The match
 * is an exact `staging.` prefix on the hostname, so a host that merely contains
 * the word (notstaging.example.com) is not caught.
 */
export function isStagingHost(headers: HeaderReader): boolean {
  const raw = headers.get("x-forwarded-host") ?? headers.get("host") ?? "";
  // X-Forwarded-Host can be a comma-separated chain; the first entry is the client-facing host.
  const host = raw.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
  return host.startsWith("staging.");
}

/**
 * What the staging host answers: a bare plain-text 404, indistinguishable from
 * "no such route". Deliberately NOT the branded not-found page — that renders
 * through the root layout, which mounts the nav, footer, Clerk and a Convex
 * websocket, i.e. it would still serve the site's chrome on the duplicate host.
 *
 * This is a 404 rather than a password prompt because the build has no secret
 * to check a password against: every build-time variable is NEXT_PUBLIC_* and
 * therefore baked into the public JavaScript. If a runtime secret is ever added
 * to the VPS environment, this can become HTTP basic auth.
 */
export function stagingNotFound(): Response {
  return new Response("Not found\n", {
    status: 404,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
      "cache-control": "no-store",
    },
  });
}
