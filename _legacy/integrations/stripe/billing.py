"""
Stripe billing and payment processing integration
"""

import logging
import stripe
from typing import Dict, Any, Optional, List
from datetime import datetime

from ..convex_client import convex
from ..config import config

logger = logging.getLogger(__name__)

# Configure Stripe
stripe.api_key = config.stripe_api_key


class StripeBillingHandler:
    """Handle Stripe billing operations and webhooks"""

    def __init__(self):
        self.stripe = stripe
        self.convex = convex
        self.webhook_secret = config.stripe_webhook_secret

    async def create_customer(
        self,
        lead_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create Stripe customer from lead data

        Args:
            lead_data: Lead information

        Returns:
            Customer creation result
        """
        try:
            customer = stripe.Customer.create(
                email=lead_data.get("email"),
                name=lead_data.get("name"),
                metadata={
                    "lead_id": lead_data.get("lead_id"),
                    "company": lead_data.get("company", "")
                }
            )

            # Update lead with Stripe customer ID
            await self.convex.log_activity(
                action="stripe_customer_created",
                entity_type="lead",
                entity_id=lead_data.get("lead_id"),
                entity_name=lead_data.get("name"),
                details={
                    "customer_id": customer.id
                }
            )

            return {
                "success": True,
                "customer_id": customer.id,
                "email": customer.email
            }

        except stripe.error.StripeError as e:
            logger.error(f"Stripe customer creation error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_days: int = 0
    ) -> Dict[str, Any]:
        """
        Create subscription for customer

        Args:
            customer_id: Stripe customer ID
            price_id: Stripe price ID
            trial_days: Trial period in days

        Returns:
            Subscription creation result
        """
        try:
            subscription_params = {
                "customer": customer_id,
                "items": [{"price": price_id}],
            }

            if trial_days > 0:
                subscription_params["trial_period_days"] = trial_days

            subscription = stripe.Subscription.create(**subscription_params)

            return {
                "success": True,
                "subscription_id": subscription.id,
                "status": subscription.status,
                "current_period_end": subscription.current_period_end
            }

        except stripe.error.StripeError as e:
            logger.error(f"Stripe subscription creation error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def create_payment_link(
        self,
        price_id: str,
        lead_id: str,
        success_url: str = "https://example.com/success",
        cancel_url: str = "https://example.com/cancel"
    ) -> Dict[str, Any]:
        """
        Create payment link for one-time or recurring payment

        Args:
            price_id: Stripe price ID
            lead_id: Lead identifier
            success_url: URL to redirect on success
            cancel_url: URL to redirect on cancel

        Returns:
            Payment link details
        """
        try:
            payment_link = stripe.PaymentLink.create(
                line_items=[
                    {
                        "price": price_id,
                        "quantity": 1
                    }
                ],
                metadata={
                    "lead_id": lead_id
                },
                after_completion={
                    "type": "redirect",
                    "redirect": {
                        "url": success_url
                    }
                }
            )

            return {
                "success": True,
                "payment_link_id": payment_link.id,
                "url": payment_link.url
            }

        except stripe.error.StripeError as e:
            logger.error(f"Payment link creation error: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    async def handle_webhook_event(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process Stripe webhook events

        Args:
            event_data: Stripe event payload

        Returns:
            Processing result
        """
        event_type = event_data.get("type")

        handlers = {
            "payment_intent.succeeded": self._handle_payment_succeeded,
            "payment_intent.payment_failed": self._handle_payment_failed,
            "customer.subscription.created": self._handle_subscription_created,
            "customer.subscription.updated": self._handle_subscription_updated,
            "customer.subscription.deleted": self._handle_subscription_canceled,
            "invoice.payment_succeeded": self._handle_invoice_paid,
            "invoice.payment_failed": self._handle_invoice_failed
        }

        handler = handlers.get(event_type)

        if handler:
            return await handler(event_data)
        else:
            logger.info(f"Unhandled Stripe event type: {event_type}")
            return {
                "success": True,
                "action": "ignored",
                "event_type": event_type
            }

    async def _handle_payment_succeeded(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle successful payment"""
        payment_intent = event_data["data"]["object"]

        amount = payment_intent["amount"] / 100  # Convert from cents
        customer_id = payment_intent.get("customer")
        metadata = payment_intent.get("metadata", {})
        lead_id = metadata.get("lead_id")

        # Boost lead score for successful payment
        if lead_id:
            await self.convex.update_lead_score(
                lead_id=lead_id,
                score=95  # High score for paying customers
            )

            # Convert lead to client
            await self.convex.create_client(
                company_name=metadata.get("company", "Customer"),
                contact_name=metadata.get("name", "Customer"),
                contact_email=metadata.get("email", ""),
                stripe_customer_id=customer_id
            )

        # Log payment
        await self.convex.log_activity(
            action="payment_received",
            entity_type="payment",
            entity_id=payment_intent["id"],
            entity_name=f"${amount:.2f} payment",
            details={
                "amount": amount,
                "currency": payment_intent["currency"],
                "customer_id": customer_id
            }
        )

        return {
            "success": True,
            "action": "payment_processed",
            "amount": amount
        }

    async def _handle_payment_failed(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle failed payment"""
        payment_intent = event_data["data"]["object"]
        error = payment_intent.get("last_payment_error", {})

        await self.convex.log_activity(
            action="payment_failed",
            entity_type="payment",
            entity_id=payment_intent["id"],
            entity_name="Payment failure",
            details={
                "error_message": error.get("message"),
                "customer_id": payment_intent.get("customer")
            }
        )

        return {
            "success": True,
            "action": "payment_failed",
            "error": error.get("message")
        }

    async def _handle_subscription_created(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle new subscription creation"""
        subscription = event_data["data"]["object"]

        # Extract subscription details
        customer_id = subscription["customer"]
        status = subscription["status"]
        items = subscription["items"]["data"]

        # Calculate MRR
        mrr = 0
        for item in items:
            price = item["price"]
            if price["recurring"]["interval"] == "month":
                mrr += price["unit_amount"] / 100
            elif price["recurring"]["interval"] == "year":
                mrr += (price["unit_amount"] / 100) / 12

        # Create client if active subscription
        if status == "active":
            await self.convex.create_client(
                company_name="Subscription Customer",
                contact_name="Customer",
                contact_email="",
                stripe_customer_id=customer_id
            )

        return {
            "success": True,
            "action": "subscription_created",
            "subscription_id": subscription["id"],
            "mrr": mrr
        }

    async def _handle_subscription_updated(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle subscription updates"""
        subscription = event_data["data"]["object"]

        return {
            "success": True,
            "action": "subscription_updated",
            "subscription_id": subscription["id"],
            "status": subscription["status"]
        }

    async def _handle_subscription_canceled(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle subscription cancellation"""
        subscription = event_data["data"]["object"]

        await self.convex.log_activity(
            action="subscription_canceled",
            entity_type="subscription",
            entity_id=subscription["id"],
            entity_name="Subscription cancellation",
            details={
                "customer_id": subscription["customer"],
                "canceled_at": subscription.get("canceled_at")
            }
        )

        return {
            "success": True,
            "action": "subscription_canceled",
            "subscription_id": subscription["id"]
        }

    async def _handle_invoice_paid(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle paid invoice"""
        invoice = event_data["data"]["object"]

        return {
            "success": True,
            "action": "invoice_paid",
            "invoice_id": invoice["id"],
            "amount_paid": invoice["amount_paid"] / 100
        }

    async def _handle_invoice_failed(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle failed invoice payment"""
        invoice = event_data["data"]["object"]

        return {
            "success": True,
            "action": "invoice_failed",
            "invoice_id": invoice["id"]
        }

    def verify_webhook_signature(
        self,
        payload: str,
        signature: str
    ) -> bool:
        """
        Verify Stripe webhook signature

        Args:
            payload: Raw request body
            signature: Stripe signature header

        Returns:
            True if valid, False otherwise
        """
        try:
            stripe.Webhook.construct_event(
                payload,
                signature,
                self.webhook_secret
            )
            return True
        except stripe.error.SignatureVerificationError:
            return False

    def calculate_mrr(
        self,
        subscriptions: List[Dict[str, Any]]
    ) -> float:
        """
        Calculate Monthly Recurring Revenue

        Args:
            subscriptions: List of subscription data

        Returns:
            Total MRR in dollars
        """
        total_mrr = 0.0

        for sub in subscriptions:
            amount = sub["amount"] / 100  # Convert from cents
            interval = sub.get("interval", "month")
            quantity = sub.get("quantity", 1)

            if interval == "month":
                total_mrr += amount * quantity
            elif interval == "year":
                total_mrr += (amount * quantity) / 12
            elif interval == "week":
                total_mrr += (amount * quantity) * 4.33

        return round(total_mrr, 2)