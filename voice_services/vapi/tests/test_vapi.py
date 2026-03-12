"""
Test suite for Vapi voice agent integration.
Tests voice flow, event processing, and lead qualification logic.
"""

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

# Import modules to test
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from vapi.agent_config import VapiAgentConfig, SalesPersonality
from vapi.call_handler import CallEventHandler, CallEvent, CallStatus
from vapi.transcript_processor import TranscriptProcessor, CallAnalysis


class TestVapiAgentConfig:
    """Test voice agent configuration and personality setup."""

    def test_sales_personality_initialization(self):
        """Test sales personality configuration."""
        personality = SalesPersonality()

        assert personality.name == "Alex"
        assert personality.role == "sales discovery agent"
        assert personality.company == "iCodeMyBusiness"
        assert personality.tone == "warm, confident, conversational"
        assert personality.objective == "qualify leads and book discovery calls"

    def test_agent_config_creation(self):
        """Test Vapi agent configuration creation."""
        config = VapiAgentConfig()
        agent = config.create_agent()

        assert agent["name"] == "Alex"
        assert agent["model"]["provider"] == "anthropic"
        assert agent["model"]["model"] == "claude-3-sonnet-20240229"
        assert "firstMessage" in agent
        assert "systemMessage" in agent
        assert len(agent["functions"]) > 0  # Should have functions for booking, transfer, etc.

    def test_conversation_flow_phases(self):
        """Test conversation flow phases are configured."""
        config = VapiAgentConfig()
        phases = config.get_conversation_phases()

        assert len(phases) == 5
        assert phases[0]["name"] == "greeting"
        assert phases[1]["name"] == "pain_discovery"
        assert phases[2]["name"] == "value_bridge"
        assert phases[3]["name"] == "qualification"
        assert phases[4]["name"] == "booking"

    def test_guardrails_configuration(self):
        """Test guardrails are properly configured."""
        config = VapiAgentConfig()
        guardrails = config.get_guardrails()

        assert "pricing_deflection" in guardrails
        assert "technical_redirect" in guardrails
        assert "tangent_handling" in guardrails
        assert "competitor_response" in guardrails


class TestCallEventHandler:
    """Test call event processing and logging."""

    @pytest.fixture
    def handler(self):
        """Create a call event handler instance."""
        return CallEventHandler(api_key="test-api-key")

    def test_handle_inbound_call(self, handler):
        """Test handling inbound call events."""
        event = CallEvent(
            type="call-start",
            call_id="call_123",
            direction="inbound",
            from_number="+14155551234",
            to_number="+14155555678",
            timestamp=datetime.now().isoformat()
        )

        with patch.object(handler, 'log_to_convex') as mock_log:
            result = handler.handle_event(event)

            assert result["status"] == "processing"
            assert result["call_id"] == "call_123"
            mock_log.assert_called_once()

    def test_handle_call_end_event(self, handler):
        """Test handling call end events with transcript."""
        event = CallEvent(
            type="call-end",
            call_id="call_123",
            duration=180,
            transcript="Hello, I'm interested in your services...",
            recording_url="https://recordings.vapi.ai/call_123.mp3",
            timestamp=datetime.now().isoformat()
        )

        with patch.object(handler, 'process_transcript') as mock_process:
            with patch.object(handler, 'update_lead_score') as mock_score:
                result = handler.handle_event(event)

                assert result["status"] == "completed"
                mock_process.assert_called_once_with("call_123", event.transcript)
                mock_score.assert_called_once()

    def test_handle_transfer_event(self, handler):
        """Test handling call transfer events."""
        event = CallEvent(
            type="transfer-start",
            call_id="call_123",
            transfer_to="matthew",
            reason="Complex technical questions",
            timestamp=datetime.now().isoformat()
        )

        with patch.object(handler, 'initiate_transfer') as mock_transfer:
            result = handler.handle_event(event)

            assert result["status"] == "transferring"
            assert result["transfer_to"] == "matthew"
            mock_transfer.assert_called_once()

    def test_error_handling(self, handler):
        """Test error handling for invalid events."""
        event = CallEvent(
            type="invalid-event",
            call_id="call_123",
            timestamp=datetime.now().isoformat()
        )

        with pytest.raises(ValueError) as exc_info:
            handler.handle_event(event)

        assert "Unknown event type" in str(exc_info.value)


class TestTranscriptProcessor:
    """Test transcript analysis and lead scoring."""

    @pytest.fixture
    def processor(self):
        """Create a transcript processor instance."""
        return TranscriptProcessor()

    def test_extract_pain_points(self, processor):
        """Test extracting pain points from transcript."""
        transcript = """
        Customer: We're spending about 10 hours a week just manually following up with leads.
        Alex: That's exactly the kind of thing we build systems for.
        Customer: Also, our website is really outdated and we can't make the changes we need.
        Alex: I understand. How is that affecting your business?
        Customer: We're losing potential customers because the site doesn't reflect what we actually do.
        """

        analysis = processor.analyze_transcript(transcript)

        assert len(analysis.pain_points) >= 2
        assert any("lead" in point.lower() for point in analysis.pain_points)
        assert any("website" in point.lower() for point in analysis.pain_points)

    def test_calculate_lead_score(self, processor):
        """Test lead scoring based on conversation signals."""
        analysis = CallAnalysis(
            call_id="call_123",
            pain_points=["manual lead follow-up", "outdated website"],
            qualification_signals={
                "team_size": "5-10",
                "timeline": "this month",
                "budget_awareness": True,
                "previous_solutions_tried": True
            },
            sentiment="positive",
            intent_to_book=True
        )

        score = processor.calculate_lead_score(analysis)

        assert 70 <= score <= 90  # Should be high score based on signals

    def test_sentiment_analysis(self, processor):
        """Test sentiment analysis of conversation."""
        positive_transcript = """
        Customer: This sounds exactly like what we need!
        Alex: Great! I think Matthew would really enjoy digging into this with you.
        Customer: Yes, I'm definitely interested in learning more.
        """

        negative_transcript = """
        Customer: I don't think this is for us.
        Alex: I understand. Can you tell me more about your concerns?
        Customer: It just seems too complicated and expensive.
        """

        positive_analysis = processor.analyze_sentiment(positive_transcript)
        negative_analysis = processor.analyze_sentiment(negative_transcript)

        assert positive_analysis["sentiment"] == "positive"
        assert positive_analysis["confidence"] > 0.7

        assert negative_analysis["sentiment"] == "negative"
        assert negative_analysis["confidence"] > 0.6

    def test_extract_next_steps(self, processor):
        """Test extracting next steps from conversation."""
        transcript = """
        Alex: Would this Thursday at 2 PM work for the discovery call?
        Customer: Thursday works great!
        Alex: Perfect! I'll send you a calendar invite. Matthew will also send you a brief questionnaire.
        Customer: Sounds good. Should I prepare anything specific?
        Alex: Just think about your current workflow and where the bottlenecks are.
        """

        analysis = processor.analyze_transcript(transcript)

        assert len(analysis.next_steps) >= 2
        assert any("discovery call" in step.lower() for step in analysis.next_steps)
        assert any("questionnaire" in step.lower() or "prepare" in step.lower()
                  for step in analysis.next_steps)

    def test_identify_objections(self, processor):
        """Test identifying objections raised during call."""
        transcript = """
        Customer: I'm concerned about the cost. We've been burned by developers before.
        Alex: I hear that a lot. Matthew's process starts with discovery, not coding.
        Customer: Also, how is this different from just using Zapier?
        Alex: Great question. We build custom systems that go beyond what no-code tools can do.
        Customer: I need to think about it and discuss with my partner.
        """

        analysis = processor.analyze_transcript(transcript)

        assert len(analysis.objections) >= 3
        assert any("cost" in obj.lower() for obj in analysis.objections)
        assert any("burned" in obj.lower() or "previous" in obj.lower()
                  for obj in analysis.objections)
        assert any("zapier" in obj.lower() or "no-code" in obj.lower()
                  for obj in analysis.objections)


class TestVoiceFlowIntegration:
    """Test complete voice flow integration."""

    @pytest.fixture
    def setup_integration(self):
        """Setup integration test environment."""
        config = VapiAgentConfig()
        handler = CallEventHandler(api_key="test-api-key")
        processor = TranscriptProcessor()

        return {
            "config": config,
            "handler": handler,
            "processor": processor
        }

    @patch('vapi.call_handler.requests.post')
    @patch('vapi.call_handler.ConvexClient')
    def test_complete_successful_call_flow(self, mock_convex, mock_requests, setup_integration):
        """Test complete flow of a successful sales call."""
        handler = setup_integration["handler"]

        # Mock Convex client
        mock_convex_instance = MagicMock()
        mock_convex.return_value = mock_convex_instance

        # Start call
        start_event = CallEvent(
            type="call-start",
            call_id="call_456",
            direction="inbound",
            from_number="+14155551234",
            to_number="+14155555678",
            timestamp=datetime.now().isoformat()
        )

        start_result = handler.handle_event(start_event)
        assert start_result["status"] == "processing"

        # End call with successful booking
        end_event = CallEvent(
            type="call-end",
            call_id="call_456",
            duration=240,
            transcript="""
            Alex: Hi! I'm Alex with iCodeMyBusiness. What's eating up your time right now?
            Customer: We're manually tracking all our leads in spreadsheets.
            Alex: That sounds time-consuming. How many hours per week?
            Customer: Probably 15 hours between me and my assistant.
            Alex: We can build a custom system to automate that. Would you like to discuss with Matthew?
            Customer: Yes, definitely!
            Alex: Great! Does Thursday at 2 PM work?
            Customer: Perfect!
            """,
            recording_url="https://recordings.vapi.ai/call_456.mp3",
            timestamp=datetime.now().isoformat()
        )

        end_result = handler.handle_event(end_event)

        assert end_result["status"] == "completed"
        assert end_result["booking_scheduled"] == True
        assert end_result["lead_score"] >= 70

        # Verify Convex was called to update lead
        assert mock_convex_instance.mutation.call_count >= 1

    @patch('vapi.call_handler.requests.post')
    def test_failed_call_handling(self, mock_requests, setup_integration):
        """Test handling of failed or dropped calls."""
        handler = setup_integration["handler"]

        # Simulate failed call
        failed_event = CallEvent(
            type="call-failed",
            call_id="call_789",
            reason="network_error",
            timestamp=datetime.now().isoformat()
        )

        with patch.object(handler, 'log_to_convex') as mock_log:
            result = handler.handle_event(failed_event)

            assert result["status"] == "failed"
            assert result["reason"] == "network_error"
            mock_log.assert_called_once()

    def test_real_time_transfer_decision(self, setup_integration):
        """Test real-time decision making for call transfer."""
        processor = setup_integration["processor"]

        # Transcript indicating need for transfer
        complex_transcript = """
        Customer: I need to understand the technical architecture.
        How does your system handle database migrations?
        Alex: That's a great technical question. Matthew, our engineer, would be best to discuss that.
        Customer: Also, what about CI/CD pipelines and deployment strategies?
        """

        analysis = processor.analyze_transcript(complex_transcript)
        transfer_decision = processor.should_transfer(analysis)

        assert transfer_decision["should_transfer"] == True
        assert transfer_decision["reason"] == "technical_complexity"
        assert transfer_decision["transfer_to"] == "matthew"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])