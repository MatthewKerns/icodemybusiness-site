import "server-only";

const PLAN_TO_PRICE: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_ID_STARTER ?? "",
  pro: process.env.STRIPE_PRICE_ID_PRO ?? "",
  enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? "",
};

const PRICE_TO_PLAN: Record<string, string> = Object.fromEntries(
  Object.entries(PLAN_TO_PRICE)
    .filter(([, priceId]) => priceId)
    .map(([plan, priceId]) => [priceId, plan])
);

export function priceIdForPlan(plan: string): string {
  const priceId = PLAN_TO_PRICE[plan];
  if (!priceId) {
    throw new Error(`Unknown plan: ${plan}`);
  }
  return priceId;
}

export function planFromPriceId(priceId: string): string {
  const plan = PRICE_TO_PLAN[priceId];
  if (!plan) {
    throw new Error(`Unknown price ID: ${priceId}`);
  }
  return plan;
}
