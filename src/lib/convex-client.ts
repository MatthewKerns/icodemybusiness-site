import { ConvexHttpClient } from "convex/browser";

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

/** @deprecated Use getConvexClient() instead — kept for backwards compatibility */
export const convex = new Proxy({} as ConvexHttpClient, {
  get(_target, prop) {
    return (getConvexClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
