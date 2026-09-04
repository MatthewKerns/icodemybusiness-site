/**
 * The URL a visitor actually typed, reconstructed behind a reverse proxy.
 *
 * In the standalone Docker build, `request.url` inside middleware is the
 * container's bind address (`https://0.0.0.0:3000/...`), not the public host —
 * so anything that echoes it back to the browser (a sign-in `redirect_url`, a
 * redirect base) sends the visitor to a dead host after sign-in. Seen on staging
 * 2026-09-04: `/admin/funnel` → `/sign-in?redirect_url=https://0.0.0.0:3000/...`.
 *
 * Traefik sets `x-forwarded-host` / `x-forwarded-proto`; the plain `host` header
 * is the next best source. Only when neither exists (local `next dev`) do we
 * fall back to what the runtime reported.
 */

export interface PublicUrlSource {
  headers: { get(name: string): string | null };
  nextUrl: { protocol: string; host: string; pathname: string; search: string };
}

/** Public origin (`https://staging.icodemybusiness.com`) for this request. */
export function publicOrigin(request: PublicUrlSource): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ?? request.headers.get("host") ?? request.nextUrl.host)
    .split(",")[0]
    .trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto ?? request.nextUrl.protocol.replace(/:$/, "");
  return `${proto}://${host}`;
}

/** Public absolute URL for the request's own path + query. */
export function publicUrl(request: PublicUrlSource): string {
  return `${publicOrigin(request)}${request.nextUrl.pathname}${request.nextUrl.search}`;
}
