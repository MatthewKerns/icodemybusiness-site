import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY environment variable is required");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

export async function createCheckoutSession(params: {
  priceId: string;
  customerId?: string;
  customerEmail?: string;
  userId: string;
  returnUrl: string;
}): Promise<Stripe.Checkout.Session> {
  return await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: params.priceId, quantity: 1 }],
    ...(params.customerId
      ? { customer: params.customerId }
      : { customer_email: params.customerEmail }),
    metadata: { userId: params.userId },
    ui_mode: "embedded",
    return_url: params.returnUrl,
  });
}

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is required");
  }
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
