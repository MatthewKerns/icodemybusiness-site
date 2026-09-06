/**
 * Is this request a browser NAVIGATION — something the user will see as a page —
 * as opposed to a fetch/API call that expects a body?
 *
 * Two request shapes count as a navigation:
 *   - a full document load: `Accept: text/html`
 *   - a Next.js App Router client-side navigation, which fetches the React
 *     Server Component payload with the `RSC: 1` header and
 *     `Accept: text/x-component`
 *
 * Why the second one matters: on 2026-09-06 the owner gate refused a signed-in
 * non-owner during the client-side navigation that follows Clerk sign-in. The
 * gate only redirected document loads, so the RSC request got a bare JSON 403,
 * which the router rendered as the route error boundary — "Something went
 * wrong" — instead of /forbidden. That looked exactly like a failing page
 * query and sent the investigation into the data layer for a full lap.
 */
export interface HeaderReader {
  get(name: string): string | null;
}

export function isNavigationRequest(headers: HeaderReader): boolean {
  // A prefetch (hovering a link) also carries `RSC: 1`. It is not a navigation:
  // answering it with a redirect would be harmless but muddles intent, and a
  // plain 403 simply makes the router drop the prefetch. The real click that
  // follows is a navigation and gets the redirect.
  if (headers.get("next-router-prefetch") === "1") return false;
  const accept = (headers.get("accept") ?? "").toLowerCase();
  if (accept.includes("text/html")) return true;
  if (accept.includes("text/x-component")) return true;
  return headers.get("rsc") === "1";
}

/** Short label of the request shape, for the refusal log line. */
export function describeRequestKind(headers: HeaderReader): string {
  if (headers.get("next-router-prefetch") === "1") return "prefetch";
  const accept = (headers.get("accept") ?? "").toLowerCase();
  if (accept.includes("text/html")) return "document";
  if (headers.get("rsc") === "1" || accept.includes("text/x-component")) return "rsc-navigation";
  return `fetch(accept=${accept || "-"})`;
}
