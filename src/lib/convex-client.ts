import { ConvexHttpClient } from "convex/browser";

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

export const convex = new ConvexHttpClient(convexUrl);
