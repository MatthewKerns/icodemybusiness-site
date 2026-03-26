import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createCheckoutSession } from "@/services/stripe";
import { priceIdForPlan } from "@/lib/stripe-plans";
import {
  withErrorHandler,
  AuthError,
  ValidationError,
  InternalError,
} from "@/lib/api-error-handler";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const { userId } = await auth();
  if (!userId) {
    throw new AuthError();
  }

  const body = await request.json();
  const { plan } = body as { plan?: string };

  if (!plan || !["starter", "pro", "enterprise"].includes(plan)) {
    throw new ValidationError(
      "Invalid plan. Must be starter, pro, or enterprise."
    );
  }

  let priceId: string;
  try {
    priceId = priceIdForPlan(plan);
  } catch {
    throw new InternalError("Plan not configured. Please contact support.");
  }

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;

  const origin = request.nextUrl.origin;
  const returnUrl = `${origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`;

  const session = await createCheckoutSession({
    priceId,
    customerEmail: email,
    userId,
    returnUrl,
  });

  return NextResponse.json({ clientSecret: session.client_secret });
});
