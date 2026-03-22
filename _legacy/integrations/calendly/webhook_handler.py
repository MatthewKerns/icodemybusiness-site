"""
Calendly webhook handler for processing booking events
"""

import hmac
import hashlib
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from ..convex_client import convex
from ..config import config

logger = logging.getLogger(__name__)


def verify_webhook_signature(
    payload: str,
    signature: str,
    secret: str
) -> bool:
    """
    Verify Calendly webhook signature

    Args:
        payload: Raw request body
        signature: Signature from webhook header
        secret: Webhook signing secret

    Returns:
        True if signature is valid, False otherwise
    """
    if not signature or not secret:
        return False

    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)


def parse_calendly_event(event_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse Calendly webhook event into standardized format

    Args:
        event_data: Raw Calendly webhook payload

    Returns:
        Parsed event data with extracted fields
    """
    event_type = event_data.get("event", "")
    payload = event_data.get("payload", {})

    # Extract common fields
    parsed = {
        "event_type": payload.get("event", {}).get("name", ""),
        "name": payload.get("name", ""),
        "email": payload.get("email", ""),
        "event_id": payload.get("uri", "").split("/")[-1] if payload.get("uri") else "",
        "raw_event": event_type
    }

    # Parse event timing
    if "event" in payload and "start_time" in payload["event"]:
        start_time = payload["event"]["start_time"]
        parsed["event_time"] = int(
            datetime.fromisoformat(start_time.replace("Z", "+00:00"))
            .timestamp() * 1000
        )

    # Extract Q&A responses for additional data
    questions = payload.get("questions_and_answers", [])
    for qa in questions:
        question = qa.get("question", "").lower()
        answer = qa.get("answer", "")

        if "company" in question:
            parsed["company"] = answer
        elif "phone" in question:
            parsed["phone"] = answer
        elif "budget" in question:
            parsed["budget"] = answer
        elif "timeline" in question:
            parsed["timeline"] = answer

    # Handle cancellation events
    if event_type == "invitee.canceled":
        parsed["canceled"] = True
        parsed["cancel_reason"] = payload.get("cancel_reason", "")
        parsed["canceler_name"] = payload.get("canceler_name", "")

    return parsed


class CalendlyWebhookHandler:
    """Handler for processing Calendly webhook events"""

    def __init__(self):
        self.convex = convex
        self.secret = config.calendly_webhook_token

    async def handle_event(self, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a Calendly webhook event

        Args:
            event_data: Webhook payload from Calendly

        Returns:
            Processing result with lead_id and action taken
        """
        event_type = event_data.get("event", "")

        try:
            if event_type == "invitee.created":
                return await self._handle_booking_created(event_data)
            elif event_type == "invitee.canceled":
                return await self._handle_booking_canceled(event_data)
            else:
                logger.info(f"Ignoring unknown event type: {event_type}")
                return {
                    "success": True,
                    "action": "ignored",
                    "message": f"Unknown event type: {event_type}"
                }
        except Exception as e:
            logger.error(f"Error processing Calendly event: {e}")
            raise

    async def _handle_booking_created(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle new booking creation"""
        parsed = parse_calendly_event(event_data)

        # Create or update lead with high score (70+)
        result = await self.convex.create_lead_from_calendly(
            name=parsed["name"],
            email=parsed["email"],
            event_id=parsed["event_id"],
            event_time=parsed.get("event_time", int(datetime.now().timestamp() * 1000)),
            event_type=parsed["event_type"]
        )

        # Log activity
        await self.convex.log_activity(
            action="calendly_booking",
            entity_type="lead",
            entity_id=result.get("leadId", ""),
            entity_name=parsed["name"],
            details={
                "event_type": parsed["event_type"],
                "event_id": parsed["event_id"]
            }
        )

        return {
            "success": True,
            "action": "lead_created",
            "lead_id": result.get("leadId"),
            "message": f"Lead created from Calendly booking: {parsed['name']}"
        }

    async def _handle_booking_canceled(
        self,
        event_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle booking cancellation"""
        parsed = parse_calendly_event(event_data)

        # Log cancellation activity
        await self.convex.log_activity(
            action="calendly_canceled",
            entity_type="lead",
            entity_id=parsed["event_id"],
            entity_name=parsed["name"],
            details={
                "cancel_reason": parsed.get("cancel_reason", ""),
                "canceler": parsed.get("canceler_name", "")
            }
        )

        return {
            "success": True,
            "action": "booking_canceled",
            "message": f"Booking canceled for: {parsed['name']}"
        }

    def verify_signature(self, payload: str, signature: str) -> bool:
        """Verify webhook signature"""
        return verify_webhook_signature(payload, signature, self.secret)