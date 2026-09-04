import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";

let _client: ConvexHttpClient | null = null;

function getConvexUrl(): string {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not set. Please add it to your environment variables."
    );
  }

  try {
    const parsed = new URL(convexUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error(
        `NEXT_PUBLIC_CONVEX_URL must use https:// (or http:// for local dev). Got: "${parsed.protocol}"`
      );
    }
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        `NEXT_PUBLIC_CONVEX_URL is not a valid URL: "${convexUrl}"`
      );
    }
    throw err;
  }

  return convexUrl;
}

/** Lazily initialized Convex HTTP client — avoids throwing at module load during build */
export function getConvexClient(): ConvexHttpClient {
  if (!_client) {
    _client = new ConvexHttpClient(getConvexUrl());
  }
  return _client;
}

/**
 * A per-request client carrying the caller's Clerk identity, for route handlers
 * that touch data an owner can hold.
 *
 * Deliberately NOT the singleton above. `setAuth` mutates the client, so a
 * shared instance would carry one visitor's identity into the next request that
 * landed on the same warm lambda — a cross-user auth leak, and a worse bug than
 * the missing authorisation this exists to fix.
 *
 * An anonymous visitor has no token; the client is then simply unauthenticated,
 * which is exactly right for a session nobody owns yet.
 */
export async function getAuthedConvexClient(): Promise<ConvexHttpClient> {
  const client = new ConvexHttpClient(getConvexUrl());
  try {
    const { getToken } = await auth();
    const token = await getToken({ template: "convex" });
    if (token) client.setAuth(token);
  } catch {
    // No Clerk context, or no session. Anonymous is a valid caller here.
  }
  return client;
}

/** @deprecated Use getConvexClient() instead — kept for backwards compatibility */
export const convex = new Proxy({} as ConvexHttpClient, {
  get(_target, prop) {
    return (getConvexClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
