import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { stripe } from "@/services/stripe";
import {
  withErrorHandler,
  AuthError,
  NotFoundError,
} from "@/lib/api-error-handler";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AuthError();
  }

  const subscription = await convex.query(api.subscriptions.getActiveSubscription, {
    userId,
  });

  if (!subscription) {
    throw new NotFoundError("No active subscription found");
  }

  const origin = request.nextUrl.origin;

  // Note: The Customer Portal must be configured in the Stripe Dashboard
  // https://dashboard.stripe.com/test/settings/billing/portal
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${origin}/subscribe`,
  });

  return NextResponse.json({ url: portalSession.url });
});
