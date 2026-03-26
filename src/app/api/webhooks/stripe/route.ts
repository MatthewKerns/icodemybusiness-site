import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { constructWebhookEvent } from "@/services/stripe";
import { stripe } from "@/services/stripe";
import { planFromPriceId } from "@/lib/stripe-plans";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const customerId =
          typeof session.customer === "string" ? session.customer : undefined;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : undefined;

        if (!userId || !customerId) {
          console.error("Missing userId or customerId in checkout session");
          return NextResponse.json(
            { error: "Missing userId or customerId in session metadata" },
            { status: 400 }
          );
        }

        // Derive plan from the Stripe price ID
        let plan = "pro"; // fallback
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = sub.items.data[0]?.price?.id;
          if (priceId) {
            plan = planFromPriceId(priceId);
          }
        }

        await convex.mutation(api.subscriptions.createSubscription, {
          userId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          plan,
          status: "active",
        });

        await convex.mutation(api.auditLog.logAuditEvent, {
          eventType: "checkout.session.completed",
          actorId: userId,
          details: JSON.stringify({
            customerId,
            subscriptionId,
            sessionId: session.id,
          }),
          stripeEventId: event.id,
          severity: "info",
        });
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : undefined;

        if (customerId && subscription.metadata?.userId) {
          // Derive plan from the current price
          const updatedPriceId = subscription.items.data[0]?.price?.id;
          let updatedPlan: string | undefined;
          if (updatedPriceId) {
            try {
              updatedPlan = planFromPriceId(updatedPriceId);
            } catch {
              console.warn(`Unknown price ID in subscription update: ${updatedPriceId}`);
            }
          }

          await convex.mutation(api.subscriptions.updateSubscriptionStatus, {
            userId: subscription.metadata.userId,
            status: subscription.status,
            stripeSubscriptionId: subscription.id,
            plan: updatedPlan,
          });

          await convex.mutation(api.auditLog.logAuditEvent, {
            eventType: "customer.subscription.updated",
            actorId: subscription.metadata.userId,
            details: JSON.stringify({
              subscriptionId: subscription.id,
              status: subscription.status,
            }),
            stripeEventId: event.id,
            severity: "info",
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        if (subscription.metadata?.userId) {
          await convex.mutation(api.subscriptions.updateSubscriptionStatus, {
            userId: subscription.metadata.userId,
            status: "canceled",
          });

          await convex.mutation(api.auditLog.logAuditEvent, {
            eventType: "customer.subscription.deleted",
            actorId: subscription.metadata.userId,
            details: JSON.stringify({
              subscriptionId: subscription.id,
            }),
            stripeEventId: event.id,
            severity: "warn",
          });
        }
        break;
      }

      default:
        // Unhandled event type — log and continue
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error processing Stripe event ${event?.type ?? "unknown"}:`, message);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
