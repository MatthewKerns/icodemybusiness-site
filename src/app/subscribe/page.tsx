import { redirect } from "next/navigation";

/**
 * Self-serve subscription checkout is retired — paid work now goes through
 * a booked call (/consulting), not public pricing tiers. The Stripe checkout
 * machinery (API routes, EmbeddedCheckoutDialog, PricingTier, webhook) stays
 * in the repo dormant in case self-serve is relaunched later.
 */
export default function SubscribePage() {
  redirect("/consulting");
}
