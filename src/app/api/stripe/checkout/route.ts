import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createCheckoutSession } from "@/services/stripe";
import { priceIdForPlan } from "@/lib/stripe-plans";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { plan } = body as { plan?: string };

  if (!plan || !["starter", "pro", "enterprise"].includes(plan)) {
    return NextResponse.json(
      { error: "Invalid plan. Must be starter, pro, or enterprise." },
      { status: 400 }
    );
  }

  let priceId: string;
  try {
    priceId = priceIdForPlan(plan);
  } catch {
    return NextResponse.json(
      { error: "Plan not configured. Please contact support." },
      { status: 500 }
    );
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
}
