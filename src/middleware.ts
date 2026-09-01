import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isWebhookRateLimited } from "@/lib/webhook-rate-limit";
import { applyAttribution } from "@/lib/attribution-middleware";
import { isOwnerEmail, isOwnerUserId } from "@/lib/owner";
import { isOwnerByApiLookup } from "@/lib/owner-lookup";

/**
 * A browser navigation gets an HTML page; an API/fetch caller keeps the JSON 403.
 * /forbidden deliberately lives OUTSIDE /admin so this redirect cannot loop.
 */
function forbid(request: NextRequest) {
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("text/html")) {
    return NextResponse.redirect(new URL("/forbidden", request.url));
  }
  return NextResponse.json(
    { error: "Forbidden - Admin access required" },
    { status: 403 }
  );
}

export default clerkMiddleware(async (auth, request: NextRequest) => {
  if (request.nextUrl.pathname.startsWith("/api/webhooks/")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (isWebhookRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429 }
      );
    }
  }

  // Protect /admin/* — the operator's own surfaces.
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const { userId, sessionClaims } = await auth();

    // If not signed in, redirect to sign-in
    if (!userId) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("redirect_url", request.url);
      return NextResponse.redirect(signInUrl);
    }

    const claimEmail = (sessionClaims as { email?: string } | null)?.email;

    // Ordered cheapest-and-most-reliable first. The Clerk API lookup runs only
    // when the session token carries no email claim.
    const allowed =
      isOwnerUserId(userId) ||
      isOwnerEmail(claimEmail) ||
      (claimEmail === undefined && (await isOwnerByApiLookup(userId)));

    if (!allowed) {
      return forbid(request);
    }
  }

  const response = NextResponse.next();
  return applyAttribution(request, response);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
