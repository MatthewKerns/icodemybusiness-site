import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isWebhookRateLimited } from "@/lib/webhook-rate-limit";
import { applyAttribution } from "@/lib/attribution-middleware";
import { isOwnerEmail, isOwnerUserId } from "@/lib/owner";
import { isOwnerByApiLookup } from "@/lib/owner-lookup";
import { publicOrigin, publicUrl } from "@/lib/public-url";
import { isNavigationRequest, describeRequestKind } from "@/lib/navigation-kind";

/**
 * A browser navigation gets the /forbidden page; an API/fetch caller keeps the
 * JSON 403. "Navigation" includes the App Router's client-side RSC fetch — the
 * request that follows a Clerk sign-in — not only full document loads. Before
 * 2026-09-06 only document loads were redirected, so a refused owner mid-session
 * got a JSON 403 that the router rendered as an opaque error boundary (see
 * src/lib/navigation-kind.ts). /forbidden deliberately lives OUTSIDE /admin so
 * this redirect cannot loop.
 */
function forbid(request: NextRequest) {
  // Leave a trace. On 2026-09-06 a correct refusal left none, and the symptom
  // (an error boundary) was investigated as a data-layer failure for a full lap.
  const kind = describeRequestKind(request.headers);
  console.warn(
    `[owner-gate] refused ${request.nextUrl.pathname} — request kind: ${kind}; ` +
      `response: ${isNavigationRequest(request.headers) ? "redirect /forbidden" : "403 json"}`
  );
  if (isNavigationRequest(request.headers)) {
    return NextResponse.redirect(new URL("/forbidden", publicOrigin(request)));
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
      // Public URL, not request.url: behind Traefik the latter is the container's
      // bind address and the visitor would land on https://0.0.0.0:3000 after sign-in.
      const signInUrl = new URL("/sign-in", publicOrigin(request));
      signInUrl.searchParams.set("redirect_url", publicUrl(request));
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
