"""
Tests for Calendly webhook integration
"""

import pytest
import json
import hmac
import hashlib
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock

from ..webhook_handler import (
    CalendlyWebhookHandler,
    verify_webhook_signature,
    parse_calendly_event
)
from ..lead_creator import CalendlyLeadCreator


class TestCalendlyWebhookSignature:
    """Test webhook signature verification"""

    def test_valid_signature(self):
        """Test that valid signatures are accepted"""
        secret = "test_secret_123"
        payload = '{"event":"invitee.created","data":{"test":"data"}}'

        # Generate valid signature
        signature = hmac.new(
            secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()

        assert verify_webhook_signature(payload, signature, secret) == True

    def test_invalid_signature(self):
        """Test that invalid signatures are rejected"""
        secret = "test_secret_123"
        payload = '{"event":"invitee.created","data":{"test":"data"}}'
        invalid_signature = "invalid_signature_12345"

        assert verify_webhook_signature(payload, signature, secret) == False

    def test_empty_signature(self):
        """Test that empty signatures are rejected"""
        secret = "test_secret_123"
        payload = '{"event":"invitee.created","data":{"test":"data"}}'

        assert verify_webhook_signature(payload, "", secret) == False


class TestCalendlyEventParsing:
    """Test Calendly event parsing"""

    def test_parse_invitee_created_event(self):
        """Test parsing of invitee.created event"""
        event_data = {
            "event": "invitee.created",
            "payload": {
                "uri": "https://api.calendly.com/scheduled_events/AAAA",
                "name": "John Doe",
                "email": "john@example.com",
                "event": {
                    "uri": "https://api.calendly.com/events/BBBB",
                    "name": "30 Minute Meeting",
                    "start_time": "2024-03-15T10:00:00Z",
                    "end_time": "2024-03-15T10:30:00Z"
                },
                "questions_and_answers": [
                    {
                        "question": "Company Name",
                        "answer": "Acme Corp"
                    },
                    {
                        "question": "Phone Number",
                        "answer": "+1-555-0100"
                    }
                ]
            }
        }

        result = parse_calendly_event(event_data)

        assert result["name"] == "John Doe"
        assert result["email"] == "john@example.com"
        assert result["event_type"] == "30 Minute Meeting"
        assert result["company"] == "Acme Corp"
        assert result["phone"] == "+1-555-0100"
        assert result["event_id"] == "AAAA"

    def test_parse_invitee_canceled_event(self):
        """Test parsing of invitee.canceled event"""
        event_data = {
            "event": "invitee.canceled",
            "payload": {
                "uri": "https://api.calendly.com/scheduled_events/CCCC",
                "name": "Jane Smith",
                "email": "jane@example.com",
                "event": {
                    "uri": "https://api.calendly.com/events/DDDD",
                    "name": "Discovery Call"
                },
                "canceled": True,
                "canceler_name": "Jane Smith",
                "cancel_reason": "Schedule conflict"
            }
        }

        result = parse_calendly_event(event_data)

        assert result["canceled"] == True
        assert result["cancel_reason"] == "Schedule conflict"
        assert result["name"] == "Jane Smith"


@pytest.mark.asyncio
class TestCalendlyWebhookHandler:
    """Test Calendly webhook handler"""

    async def test_handle_invitee_created(self):
        """Test handling of new booking"""
        handler = CalendlyWebhookHandler()

        with patch('integrations.convex_client.convex.create_lead_from_calendly') as mock_create:
            mock_create.return_value = {"leadId": "lead_123"}

            event_data = {
                "event": "invitee.created",
                "payload": {
                    "uri": "https://api.calendly.com/scheduled_events/TEST123",
                    "name": "Test User",
                    "email": "test@example.com",
                    "event": {
                        "name": "Consultation Call",
                        "start_time": "2024-03-15T15:00:00Z"
                    }
                }
            }

            result = await handler.handle_event(event_data)

            assert result["success"] == True
            assert result["lead_id"] == "lead_123"
            assert result["action"] == "lead_created"

            mock_create.assert_called_once()

    async def test_handle_invitee_canceled(self):
        """Test handling of canceled booking"""
        handler = CalendlyWebhookHandler()

        with patch('integrations.convex_client.convex.update_lead_score') as mock_update:
            mock_update.return_value = {"success": True}

            event_data = {
                "event": "invitee.canceled",
                "payload": {
                    "uri": "https://api.calendly.com/scheduled_events/TEST456",
                    "name": "Cancel User",
                    "email": "cancel@example.com",
                    "event": {
                        "name": "Consultation Call"
                    },
                    "canceled": True
                }
            }

            result = await handler.handle_event(event_data)

            assert result["success"] == True
            assert result["action"] == "booking_canceled"

    async def test_handle_unknown_event(self):
        """Test handling of unknown event types"""
        handler = CalendlyWebhookHandler()

        event_data = {
            "event": "unknown.event",
            "payload": {"test": "data"}
        }

        result = await handler.handle_event(event_data)

        assert result["success"] == True
        assert result["action"] == "ignored"
        assert "unknown" in result["message"].lower()


@pytest.mark.asyncio
class TestCalendlyLeadCreator:
    """Test Calendly lead creation logic"""

    async def test_create_high_score_lead(self):
        """Test that Calendly leads get high score (70+)"""
        creator = CalendlyLeadCreator()

        with patch('integrations.convex_client.convex.create_lead_from_calendly') as mock_create:
            mock_create.return_value = {"leadId": "new_lead_123", "score": 70}

            result = await creator.create_lead_from_booking(
                name="High Value Lead",
                email="high@example.com",
                event_id="EVENT789",
                event_time=1710511200000,  # 2024-03-15 15:00:00 UTC
                event_type="Strategy Session",
                company="Enterprise Corp",
                phone="+1-555-9999"
            )

            assert result["leadId"] == "new_lead_123"
            assert result["score"] >= 70

            # Verify metadata includes Calendly event ID
            call_args = mock_create.call_args[1]
            assert call_args["event_id"] == "EVENT789"

    async def test_enrich_lead_data(self):
        """Test lead data enrichment from booking details"""
        creator = CalendlyLeadCreator()

        booking_data = {
            "name": "Jane Prospect",
            "email": "jane@bigcorp.com",
            "event_type": "Enterprise Demo",
            "questions": {
                "Company Size": "500-1000 employees",
                "Budget": "$50k-100k",
                "Timeline": "Q2 2024"
            }
        }

        enriched = creator._enrich_lead_data(booking_data)

        assert enriched["score"] >= 80  # Enterprise demo should boost score
        assert "500-1000 employees" in enriched["notes"]
        assert "Enterprise" in enriched["tags"]

    async def test_duplicate_booking_handling(self):
        """Test handling of duplicate bookings from same email"""
        creator = CalendlyLeadCreator()

        with patch('integrations.convex_client.convex.create_lead_from_calendly') as mock_create:
            # First booking creates new lead
            mock_create.return_value = {"leadId": "lead_001", "score": 70}

            result1 = await creator.create_lead_from_booking(
                name="Repeat Customer",
                email="repeat@example.com",
                event_id="EVENT001",
                event_time=1710511200000,
                event_type="Initial Call"
            )

            # Second booking updates existing lead
            mock_create.return_value = {"leadId": "lead_001", "score": 90, "updated": True}

            result2 = await creator.create_lead_from_booking(
                name="Repeat Customer",
                email="repeat@example.com",
                event_id="EVENT002",
                event_time=1710597600000,  # Next day
                event_type="Follow-up Call"
            )

            assert result1["leadId"] == result2["leadId"]
            assert result2["score"] > result1["score"]  # Score increased