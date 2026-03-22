"""
Tests for Unipile multi-channel messaging integration
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

from ..email_sync import UnipileEmailSync
from ..message_processor import UnipileMessageProcessor


@pytest.mark.asyncio
class TestUnipileEmailSync:
    """Test email synchronization via Unipile"""

    async def test_sync_inbox(self):
        """Test syncing email inbox"""
        sync = UnipileEmailSync()

        mock_emails = [
            {
                "id": "email_001",
                "from": {"email": "prospect@example.com", "name": "John Prospect"},
                "subject": "Re: Your proposal",
                "body": "I'm interested in learning more.",
                "timestamp": "2024-03-15T10:00:00Z",
                "labels": ["INBOX"]
            },
            {
                "id": "email_002",
                "from": {"email": "client@example.com", "name": "Jane Client"},
                "subject": "Project update request",
                "body": "Can we schedule a call?",
                "timestamp": "2024-03-15T11:00:00Z",
                "labels": ["INBOX", "IMPORTANT"]
            }
        ]

        with patch.object(sync, '_fetch_emails', return_value=mock_emails):
            with patch('integrations.convex_client.convex.create_lead') as mock_create:
                mock_create.return_value = {"leadId": "lead_123"}

                results = await sync.sync_inbox(since_hours=24)

                assert len(results) == 2
                assert results[0]["email_id"] == "email_001"
                assert results[0]["action"] == "lead_created"

    async def test_identify_lead_emails(self):
        """Test identifying potential lead emails"""
        sync = UnipileEmailSync()

        lead_email = {
            "from": {"email": "newlead@company.com"},
            "subject": "Interested in your services",
            "body": "Hi, I saw your website and would like to discuss a potential project."
        }

        not_lead_email = {
            "from": {"email": "noreply@newsletter.com"},
            "subject": "Your weekly newsletter",
            "body": "Here are this week's updates..."
        }

        assert sync._is_potential_lead(lead_email) == True
        assert sync._is_potential_lead(not_lead_email) == False

    async def test_send_email(self):
        """Test sending email through Unipile"""
        sync = UnipileEmailSync()

        with patch.object(sync, '_send_via_api', return_value={"message_id": "msg_123"}):
            result = await sync.send_email(
                to="prospect@example.com",
                subject="Follow-up on our conversation",
                body="Thank you for your interest...",
                cc=["team@example.com"]
            )

            assert result["success"] == True
            assert result["message_id"] == "msg_123"

    async def test_auto_reply_to_leads(self):
        """Test automatic reply to lead inquiries"""
        sync = UnipileEmailSync()

        inquiry = {
            "id": "email_003",
            "from": {"email": "inquiry@example.com", "name": "New Inquiry"},
            "subject": "Pricing information request",
            "body": "What are your rates for web development?"
        }

        with patch.object(sync, 'send_email') as mock_send:
            mock_send.return_value = {"success": True}

            result = await sync.auto_reply_to_inquiry(inquiry)

            assert result["success"] == True
            mock_send.assert_called_once()
            call_args = mock_send.call_args[1]
            assert "Thank you for your interest" in call_args["body"]


@pytest.mark.asyncio
class TestUnipileMessageProcessor:
    """Test multi-channel message processing"""

    async def test_process_linkedin_message(self):
        """Test processing LinkedIn messages"""
        processor = UnipileMessageProcessor()

        message = {
            "channel": "linkedin",
            "type": "direct_message",
            "from": {
                "id": "linkedin_user_123",
                "name": "Sarah Professional",
                "profile_url": "https://linkedin.com/in/sarah"
            },
            "content": "I'd like to connect about potential collaboration",
            "timestamp": "2024-03-15T14:00:00Z"
        }

        with patch('integrations.convex_client.convex.create_lead') as mock_create:
            mock_create.return_value = {"leadId": "lead_456"}

            result = await processor.process_message(message)

            assert result["channel"] == "linkedin"
            assert result["lead_created"] == True
            assert result["lead_id"] == "lead_456"

            # Verify LinkedIn profile was included in metadata
            call_args = mock_create.call_args[1]
            assert call_args["metadata"]["linkedinProfileUrl"] == message["from"]["profile_url"]

    async def test_process_whatsapp_message(self):
        """Test processing WhatsApp messages"""
        processor = UnipileMessageProcessor()

        message = {
            "channel": "whatsapp",
            "type": "text",
            "from": {
                "phone": "+1-555-0123",
                "name": "Mobile Contact"
            },
            "content": "Hi, I got your number from a friend. Can we discuss your services?",
            "timestamp": "2024-03-15T15:00:00Z"
        }

        with patch('integrations.convex_client.convex.create_lead') as mock_create:
            mock_create.return_value = {"leadId": "lead_789"}

            result = await processor.process_message(message)

            assert result["channel"] == "whatsapp"
            assert result["lead_created"] == True

            # Verify phone was captured
            call_args = mock_create.call_args[1]
            assert call_args["phone"] == "+1-555-0123"
            assert call_args["source"] == "whatsapp"

    async def test_channel_priority_scoring(self):
        """Test that different channels get appropriate lead scores"""
        processor = UnipileMessageProcessor()

        channels_scores = {
            "email": 50,
            "linkedin": 60,
            "whatsapp": 55,
            "facebook": 40,
            "twitter": 35
        }

        for channel, expected_score in channels_scores.items():
            score = processor._calculate_channel_score(channel)
            assert score == expected_score

    async def test_unified_inbox_aggregation(self):
        """Test aggregating messages from all channels"""
        processor = UnipileMessageProcessor()

        mock_messages = [
            {"channel": "email", "from": {"email": "test1@example.com"}},
            {"channel": "linkedin", "from": {"name": "LinkedIn User"}},
            {"channel": "whatsapp", "from": {"phone": "+1-555-0124"}}
        ]

        with patch.object(processor, '_fetch_all_messages', return_value=mock_messages):
            messages = await processor.get_unified_inbox(since_hours=24)

            assert len(messages) == 3
            assert {msg["channel"] for msg in messages} == {"email", "linkedin", "whatsapp"}

    async def test_auto_response_templates(self):
        """Test automatic response templates for different channels"""
        processor = UnipileMessageProcessor()

        templates = processor.get_response_template("linkedin", "initial_contact")
        assert "LinkedIn" in templates["greeting"]
        assert "profile" in templates["body"].lower()

        templates = processor.get_response_template("whatsapp", "initial_contact")
        assert len(templates["body"]) < 1000  # WhatsApp has length limits

    async def test_message_deduplication(self):
        """Test that duplicate messages are not processed twice"""
        processor = UnipileMessageProcessor()

        message = {
            "id": "msg_duplicate",
            "channel": "email",
            "from": {"email": "dup@example.com"},
            "content": "Test message"
        }

        with patch('integrations.convex_client.convex.create_lead') as mock_create:
            mock_create.return_value = {"leadId": "lead_001"}

            # First processing
            result1 = await processor.process_message(message)
            assert result1["lead_created"] == True

            # Second processing (should be skipped)
            result2 = await processor.process_message(message)
            assert result2["skipped"] == True
            assert result2["reason"] == "duplicate"

            # Create should only be called once
            assert mock_create.call_count == 1