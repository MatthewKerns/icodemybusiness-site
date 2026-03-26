import { NextRequest, NextResponse } from "next/server";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../../convex/_generated/api";
import { constructWebhookEvent } from "@/services/stripe";
import { stripe } from "@/services/stripe";
import { planFromPriceId } from "@/lib/stripe-plans";
import {
  withErrorHandler,
  ValidationError,
  InternalError,
} from "@/lib/api-error-handler";

export const dynamic = "force-dynamic";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    throw new ValidationError("Missing signature");
  }

  const body = await request.text();

  let event;
  try {
    event = constructWebhookEvent(body, signature);
  } catch (err) {
    throw new ValidationError("Invalid signature");
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
          throw new ValidationError(
            "Missing userId or customerId in session metadata"
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
              // Ignore unknown price IDs
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
    throw new InternalError("Webhook handler failed");
  }

  return NextResponse.json({ received: true }, { status: 200 });
});
