"""
Multi-channel message processor for Unipile integration
"""

import logging
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from ..convex_client import convex
from ..config import config

logger = logging.getLogger(__name__)


class UnipileMessageProcessor:
    """Process messages from multiple channels via Unipile"""

    # Channel-specific lead scores
    CHANNEL_SCORES = {
        "email": 50,
        "linkedin": 60,
        "whatsapp": 55,
        "facebook": 40,
        "twitter": 35,
        "instagram": 35,
        "sms": 45
    }

    # Response templates by channel
    RESPONSE_TEMPLATES = {
        "linkedin": {
            "initial_contact": {
                "greeting": "Hi {name}, thanks for connecting on LinkedIn!",
                "body": "I appreciate you reaching out. I'd love to learn more about your needs and how we might help. Would you be open to a brief call this week? You can book a time that works for you here: [calendar_link]",
                "signature": "Best regards"
            }
        },
        "whatsapp": {
            "initial_contact": {
                "greeting": "Hi {name}! 👋",
                "body": "Thanks for reaching out! I'll get back to you shortly. Meanwhile, feel free to check our services at [website_link]",
                "signature": "- iCodeMyBusiness Team"
            }
        },
        "email": {
            "initial_contact": {
                "greeting": "Dear {name},",
                "body": "Thank you for your interest in our services. We've received your inquiry and will respond within 24 hours with more information.",
                "signature": "Best regards,\nThe iCodeMyBusiness Team"
            }
        }
    }

    def __init__(self):
        self.api_key = config.unipile_api_key
        self.api_url = config.unipile_api_url
        self.convex = convex
        self.processed_messages = set()

    async def process_message(
        self,
        message: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process a message from any channel

        Args:
            message: Message data with channel info

        Returns:
            Processing result with lead creation status
        """
        message_id = message.get("id")

        # Check for duplicates
        if message_id and message_id in self.processed_messages:
            return {
                "skipped": True,
                "reason": "duplicate",
                "message_id": message_id
            }

        channel = message.get("channel", "unknown")
        result = {}

        try:
            # Process based on channel type
            if channel == "linkedin":
                result = await self._process_linkedin_message(message)
            elif channel == "whatsapp":
                result = await self._process_whatsapp_message(message)
            elif channel == "email":
                result = await self._process_email_message(message)
            else:
                result = await self._process_generic_message(message)

            # Mark as processed
            if message_id:
                self.processed_messages.add(message_id)

            result["channel"] = channel
            return result

        except Exception as e:
            logger.error(f"Error processing {channel} message: {e}")
            raise

    async def _process_linkedin_message(
        self,
        message: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process LinkedIn message"""
        from_data = message.get("from", {})

        # Create lead with LinkedIn metadata
        lead_result = await self.convex.create_lead(
            name=from_data.get("name", "LinkedIn Contact"),
            email=from_data.get("email"),
            source="linkedin",
            notes=f"LinkedIn message: {message.get('content', '')}",
            metadata={
                "linkedinProfileUrl": from_data.get("profile_url"),
                "linkedin_id": from_data.get("id")
            }
        )

        return {
            "lead_created": True,
            "lead_id": lead_result.get("leadId"),
            "score": self.CHANNEL_SCORES["linkedin"]
        }

    async def _process_whatsapp_message(
        self,
        message: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process WhatsApp message"""
        from_data = message.get("from", {})

        # Create lead with phone number
        lead_result = await self.convex.create_lead(
            name=from_data.get("name", "WhatsApp Contact"),
            phone=from_data.get("phone"),
            source="whatsapp",
            notes=f"WhatsApp message: {message.get('content', '')}",
            metadata={
                "whatsapp_phone": from_data.get("phone")
            }
        )

        return {
            "lead_created": True,
            "lead_id": lead_result.get("leadId"),
            "score": self.CHANNEL_SCORES["whatsapp"]
        }

    async def _process_email_message(
        self,
        message: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process email message"""
        from_data = message.get("from", {})

        lead_result = await self.convex.create_lead(
            name=from_data.get("name", from_data.get("email", "Unknown")),
            email=from_data.get("email"),
            source="email",
            notes=f"Email subject: {message.get('subject', '')}"
        )

        return {
            "lead_created": True,
            "lead_id": lead_result.get("leadId"),
            "score": self.CHANNEL_SCORES["email"]
        }

    async def _process_generic_message(
        self,
        message: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Process message from other channels"""
        channel = message.get("channel", "unknown")
        from_data = message.get("from", {})

        lead_result = await self.convex.create_lead(
            name=from_data.get("name", f"{channel.title()} Contact"),
            email=from_data.get("email"),
            phone=from_data.get("phone"),
            source=channel,
            notes=f"{channel.title()} message: {message.get('content', '')}"
        )

        return {
            "lead_created": True,
            "lead_id": lead_result.get("leadId"),
            "score": self.CHANNEL_SCORES.get(channel, 40)
        }

    def _calculate_channel_score(self, channel: str) -> int:
        """
        Calculate lead score based on channel

        Args:
            channel: Communication channel

        Returns:
            Score value
        """
        return self.CHANNEL_SCORES.get(channel, 40)

    async def get_unified_inbox(
        self,
        since_hours: int = 24,
        channels: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get messages from all configured channels

        Args:
            since_hours: Hours to look back
            channels: Specific channels to fetch (None = all)

        Returns:
            List of messages from all channels
        """
        if channels is None:
            channels = ["email", "linkedin", "whatsapp"]

        all_messages = []

        for channel in channels:
            try:
                messages = await self._fetch_channel_messages(channel, since_hours)
                all_messages.extend(messages)
            except Exception as e:
                logger.error(f"Error fetching {channel} messages: {e}")

        # Sort by timestamp
        all_messages.sort(
            key=lambda x: x.get("timestamp", ""),
            reverse=True
        )

        return all_messages

    async def _fetch_all_messages(
        self,
        since_hours: int
    ) -> List[Dict[str, Any]]:
        """Fetch messages from all channels via Unipile API"""
        since_timestamp = (
            datetime.now() - timedelta(hours=since_hours)
        ).isoformat()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/messages",
                headers={"Authorization": f"Bearer {self.api_key}"},
                params={
                    "since": since_timestamp,
                    "limit": 200
                }
            )
            response.raise_for_status()
            return response.json().get("messages", [])

    async def _fetch_channel_messages(
        self,
        channel: str,
        since_hours: int
    ) -> List[Dict[str, Any]]:
        """Fetch messages from specific channel"""
        since_timestamp = (
            datetime.now() - timedelta(hours=since_hours)
        ).isoformat()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/{channel}/messages",
                headers={"Authorization": f"Bearer {self.api_key}"},
                params={
                    "since": since_timestamp,
                    "limit": 100
                }
            )
            response.raise_for_status()
            messages = response.json().get("messages", [])

        # Add channel info to each message
        for msg in messages:
            msg["channel"] = channel

        return messages

    def get_response_template(
        self,
        channel: str,
        template_type: str
    ) -> Dict[str, str]:
        """
        Get response template for channel

        Args:
            channel: Communication channel
            template_type: Type of template (initial_contact, follow_up, etc.)

        Returns:
            Template with greeting, body, and signature
        """
        templates = self.RESPONSE_TEMPLATES.get(channel, {})
        return templates.get(
            template_type,
            self.RESPONSE_TEMPLATES["email"]["initial_contact"]
        )

    async def send_unified_response(
        self,
        channel: str,
        to: Dict[str, Any],
        message: str,
        template_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send response through appropriate channel

        Args:
            channel: Target channel
            to: Recipient info
            message: Message content
            template_type: Optional template to use

        Returns:
            Send result
        """
        if template_type:
            template = self.get_response_template(channel, template_type)
            formatted_message = f"{template['greeting']}\n\n{message}\n\n{template['signature']}"
        else:
            formatted_message = message

        payload = {
            "channel": channel,
            "to": to,
            "message": formatted_message
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/messages/send",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=payload
            )
            response.raise_for_status()

        return {
            "success": True,
            "channel": channel,
            "message_sent": True
        }