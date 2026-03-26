import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { stripe } from "@/services/stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const subscription = await convex.query(api.subscriptions.getActiveSubscription, {
    userId,
  });

  if (!subscription) {
    return NextResponse.json(
      { error: "No active subscription found" },
      { status: 404 }
    );
  }

  const origin = request.nextUrl.origin;

  // Note: The Customer Portal must be configured in the Stripe Dashboard
  // https://dashboard.stripe.com/test/settings/billing/portal
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${origin}/subscribe`,
  });

  return NextResponse.json({ url: portalSession.url });
}
