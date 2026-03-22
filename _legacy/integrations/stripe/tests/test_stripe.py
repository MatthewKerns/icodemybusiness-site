"""
Tests for Stripe billing integration
"""

import pytest
from datetime import datetime
from unittest.mock import AsyncMock, patch, MagicMock

from ..billing import StripeBillingHandler


@pytest.mark.asyncio
class TestStripeBilling:
    """Test Stripe payment processing"""

    async def test_create_customer(self):
        """Test creating Stripe customer from lead"""
        handler = StripeBillingHandler()

        lead_data = {
            "name": "John Doe",
            "email": "john@example.com",
            "company": "Acme Corp",
            "lead_id": "lead_123"
        }

        with patch('stripe.Customer.create') as mock_create:
            mock_create.return_value = MagicMock(
                id="cus_test123",
                email="john@example.com"
            )

            customer = await handler.create_customer(lead_data)

            assert customer["customer_id"] == "cus_test123"
            assert customer["email"] == "john@example.com"

            mock_create.assert_called_once_with(
                email="john@example.com",
                name="John Doe",
                metadata={
                    "lead_id": "lead_123",
                    "company": "Acme Corp"
                }
            )

    async def test_create_subscription(self):
        """Test creating subscription for customer"""
        handler = StripeBillingHandler()

        with patch('stripe.Subscription.create') as mock_create:
            mock_create.return_value = MagicMock(
                id="sub_test123",
                status="active",
                current_period_end=1710000000
            )

            subscription = await handler.create_subscription(
                customer_id="cus_test123",
                price_id="price_test456"
            )

            assert subscription["subscription_id"] == "sub_test123"
            assert subscription["status"] == "active"

    async def test_handle_payment_succeeded(self):
        """Test handling successful payment webhook"""
        handler = StripeBillingHandler()

        event_data = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "id": "pi_test123",
                    "amount": 50000,  # $500.00
                    "currency": "usd",
                    "customer": "cus_test123",
                    "metadata": {
                        "lead_id": "lead_123"
                    }
                }
            }
        }

        with patch('integrations.convex_client.convex.update_lead_score') as mock_update:
            with patch('integrations.convex_client.convex.create_client') as mock_create:
                mock_update.return_value = {"success": True}
                mock_create.return_value = {"clientId": "client_123"}

                result = await handler.handle_webhook_event(event_data)

                assert result["success"] == True
                assert result["action"] == "payment_processed"

                # Should boost lead score for payment
                mock_update.assert_called_once()

    async def test_handle_subscription_created(self):
        """Test handling new subscription webhook"""
        handler = StripeBillingHandler()

        event_data = {
            "type": "customer.subscription.created",
            "data": {
                "object": {
                    "id": "sub_test123",
                    "customer": "cus_test123",
                    "status": "active",
                    "items": {
                        "data": [
                            {
                                "price": {
                                    "id": "price_test456",
                                    "unit_amount": 9900,  # $99.00
                                    "recurring": {
                                        "interval": "month"
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        }

        with patch('integrations.convex_client.convex.create_client') as mock_create:
            mock_create.return_value = {"clientId": "client_456"}

            result = await handler.handle_webhook_event(event_data)

            assert result["success"] == True
            assert result["action"] == "subscription_created"

    async def test_handle_payment_failed(self):
        """Test handling failed payment"""
        handler = StripeBillingHandler()

        event_data = {
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "id": "pi_test789",
                    "customer": "cus_test123",
                    "last_payment_error": {
                        "message": "Card declined"
                    }
                }
            }
        }

        with patch('integrations.convex_client.convex.log_activity') as mock_log:
            mock_log.return_value = {"success": True}

            result = await handler.handle_webhook_event(event_data)

            assert result["success"] == True
            assert result["action"] == "payment_failed"

            # Should log the failure
            mock_log.assert_called_once()

    async def test_create_payment_link(self):
        """Test creating payment link for lead"""
        handler = StripeBillingHandler()

        with patch('stripe.PaymentLink.create') as mock_create:
            mock_create.return_value = MagicMock(
                id="plink_test123",
                url="https://checkout.stripe.com/pay/plink_test123"
            )

            link = await handler.create_payment_link(
                price_id="price_test456",
                lead_id="lead_123"
            )

            assert link["payment_link_id"] == "plink_test123"
            assert "checkout.stripe.com" in link["url"]

    async def test_calculate_mrr(self):
        """Test MRR calculation from subscriptions"""
        handler = StripeBillingHandler()

        subscriptions = [
            {"amount": 9900, "interval": "month", "quantity": 1},  # $99/mo
            {"amount": 19900, "interval": "month", "quantity": 1},  # $199/mo
            {"amount": 120000, "interval": "year", "quantity": 1},  # $1200/yr = $100/mo
        ]

        mrr = handler.calculate_mrr(subscriptions)

        assert mrr == 398.00  # $99 + $199 + $100

    async def test_webhook_signature_verification(self):
        """Test Stripe webhook signature verification"""
        handler = StripeBillingHandler()

        payload = '{"test": "data"}'
        valid_signature = "valid_sig_123"
        invalid_signature = "invalid_sig_456"

        with patch('stripe.Webhook.construct_event') as mock_construct:
            # Valid signature
            mock_construct.return_value = {"test": "data"}
            assert handler.verify_webhook_signature(payload, valid_signature) == True

            # Invalid signature
            mock_construct.side_effect = stripe.error.SignatureVerificationError("Invalid", "sig")
            assert handler.verify_webhook_signature(payload, invalid_signature) == False