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
  const accept = (headers.get("accept") ?? "").toLowerCase();
  if (accept.includes("text/html")) return true;
  if (accept.includes("text/x-component")) return true;
  return headers.get("rsc") === "1";
}
