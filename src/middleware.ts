import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// In-memory rate limiter for webhook endpoints
const WEBHOOK_RATE_LIMIT = 100; // requests per minute
const WEBHOOK_RATE_WINDOW = 60_000; // 1 minute in ms
const webhookRequestLog = new Map<string, number[]>();

function isWebhookRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = webhookRequestLog.get(ip) ?? [];

  // Remove entries outside the window
  const recent = timestamps.filter((t) => now - t < WEBHOOK_RATE_WINDOW);
  recent.push(now);
  webhookRequestLog.set(ip, recent);

  // Clean up stale IPs periodically (keep map from growing unbounded)
  if (webhookRequestLog.size > 10_000) {
    const keys = Array.from(webhookRequestLog.keys());
    for (let i = 0; i < keys.length; i++) {
      const vals = webhookRequestLog.get(keys[i]!);
      if (vals && vals.every((t: number) => now - t >= WEBHOOK_RATE_WINDOW)) {
        webhookRequestLog.delete(keys[i]!);
      }
    }
  }

  return recent.length > WEBHOOK_RATE_LIMIT;
}

const VALID_COOKIE_VALUE = /^[a-zA-Z0-9-]{1,50}$/;

function applyAttribution(request: NextRequest, response: NextResponse): NextResponse {
  const src = request.nextUrl.searchParams.get("src");
  const variant = request.nextUrl.searchParams.get("variant");

  if (src && VALID_COOKIE_VALUE.test(src)) {
    response.cookies.set("icmb_source", src, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
  }

  if (variant && VALID_COOKIE_VALUE.test(variant)) {
    response.cookies.set("icmb_variant", variant, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

// Compose Clerk middleware with attribution tracking and webhook rate limiting.
// clerkMiddleware v6 accepts an async handler that runs after Clerk initializes auth.
export default clerkMiddleware(async (_auth, request: NextRequest) => {
  // Rate limit webhook endpoints
  if (request.nextUrl.pathname.startsWith("/api/webhooks/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isWebhookRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }
  }

  const response = NextResponse.next();
  return applyAttribution(request, response);
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
