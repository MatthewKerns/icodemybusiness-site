import { publicOrigin, type PublicUrlSource } from "@/lib/public-url";

/**
 * Clerk's Frontend API, served through the apex at /__clerk.
 *
 * clerk.icodemybusiness.com (Clerk on Cloudflare) is blocked by Comcast and Cox
 * Advanced Security per hostname (ticket IH270482834;
 * docs/comcast-reappeal-2026-09-17.md), and every page loads Clerk's script from
 * it. Proxying through the apex means no visitor ever needs that hostname: the
 * page stops referencing a flagged host, and sign-in works on Cox/Comcast while
 * clerk. stays flagged. This is Clerk's documented proxy pattern for Next.js
 * ("Proxying the Clerk Frontend API").
 *
 * Rollout order matters (docs/DEPLOY.md § Clerk proxy): this route ships first,
 * then the proxy URL is set on the Clerk production instance (Clerk checks
 * /__clerk/v1/proxy-health), and only then NEXT_PUBLIC_CLERK_PROXY_URL is set
 * so the browser starts using it. The Clerk-Proxy-Url header is therefore
 * derived from the request, not from that env var.
 */
export const CLERK_PROXY_PATH = "/__clerk";
const CLERK_FRONTEND_API = "https://frontend-api.clerk.dev";

export function isClerkProxyPath(pathname: string): boolean {
  return pathname === CLERK_PROXY_PATH || pathname.startsWith(`${CLERK_PROXY_PATH}/`);
}

/**
 * The upstream URL and headers for a /__clerk request, or null when the secret
 * key is missing (Clerk rejects an unauthenticated proxy, so failing loudly at
 * the edge beats a confusing upstream error).
 */
export function clerkProxyTarget(
  request: PublicUrlSource,
  incoming: Headers,
  secretKey: string | undefined
): { url: URL; headers: Headers } | null {
  if (!secretKey) return null;

  const url = new URL(CLERK_FRONTEND_API);
  url.pathname = request.nextUrl.pathname.slice(CLERK_PROXY_PATH.length) || "/";
  url.search = request.nextUrl.search;

  const headers = new Headers(incoming);
  headers.set("Clerk-Proxy-Url", `${publicOrigin(request)}${CLERK_PROXY_PATH}`);
  headers.set("Clerk-Secret-Key", secretKey);
  // Clerk rate-limits and risk-scores by client IP; behind Traefik that is the
  // first X-Forwarded-For entry, not the socket peer.
  const ip = incoming.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) headers.set("X-Forwarded-For", ip);
  return { url, headers };
}
