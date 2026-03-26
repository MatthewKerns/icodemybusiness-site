import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isWebhookRateLimited } from "@/lib/webhook-rate-limit";
import { applyAttribution } from "@/lib/attribution-middleware";
import { isAdmin } from "@/lib/auth";

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

  // Protect /admin/* routes
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const { userId } = await auth();

    // If not signed in, redirect to sign-in
    if (!userId) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set("redirect_url", request.url);
      return NextResponse.redirect(signInUrl);
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
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
