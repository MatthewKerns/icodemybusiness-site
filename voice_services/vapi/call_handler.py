"""
Call event handler for Vapi voice agent.
Processes call events, manages state, and integrates with Convex database.
"""

import json
import requests
from datetime import datetime
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor


class CallStatus(Enum):
    """Call status enumeration."""
    RINGING = "ringing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    MISSED = "missed"
    FAILED = "failed"
    TRANSFERRED = "transferred"


@dataclass
class CallEvent:
    """Voice call event data structure."""
    type: str
    call_id: str
    timestamp: str
    direction: Optional[str] = None
    from_number: Optional[str] = None
    to_number: Optional[str] = None
    duration: Optional[int] = None
    transcript: Optional[str] = None
    recording_url: Optional[str] = None
    transfer_to: Optional[str] = None
    reason: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ConvexClient:
    """Simplified Convex client for database operations."""

    def __init__(self, url: str = None, deploy_url: str = None):
        """Initialize Convex client."""
        self.url = url or os.getenv("CONVEX_URL", "https://your-convex-instance.convex.cloud")
        self.deploy_url = deploy_url or os.getenv("CONVEX_DEPLOY_URL")

    def mutation(self, name: str, args: Dict[str, Any]) -> Any:
        """Execute a Convex mutation."""
        response = requests.post(
            f"{self.url}/mutation/{name}",
            json=args,
            headers={"Content-Type": "application/json"}
        )
        return response.json()

    def query(self, name: str, args: Dict[str, Any]) -> Any:
        """Execute a Convex query."""
        response = requests.post(
            f"{self.url}/query/{name}",
            json=args,
            headers={"Content-Type": "application/json"}
        )
        return response.json()


class CallEventHandler:
    """Handle voice call events and integrate with backend systems."""

    def __init__(self, api_key: str, convex_url: Optional[str] = None):
        """Initialize call event handler.

        Args:
            api_key: Vapi API key
            convex_url: Optional Convex deployment URL
        """
        self.api_key = api_key
        self.convex = ConvexClient(url=convex_url)
        self.vapi_base_url = "https://api.vapi.ai/v1"
        self.executor = ThreadPoolExecutor(max_workers=5)
        self.active_calls = {}  # Track active calls

    def handle_event(self, event: CallEvent) -> Dict[str, Any]:
        """Process incoming call event.

        Args:
            event: Call event to process

        Returns:
            Processing result
        """
        event_handlers = {
            "call-start": self._handle_call_start,
            "call-end": self._handle_call_end,
            "transfer-start": self._handle_transfer_start,
            "call-failed": self._handle_call_failed,
            "transcript-update": self._handle_transcript_update,
            "function-call": self._handle_function_call
        }

        handler = event_handlers.get(event.type)
        if not handler:
            raise ValueError(f"Unknown event type: {event.type}")

        return handler(event)

    def _handle_call_start(self, event: CallEvent) -> Dict[str, Any]:
        """Handle call start event."""
        # Track active call
        self.active_calls[event.call_id] = {
            "status": CallStatus.IN_PROGRESS.value,
            "start_time": event.timestamp,
            "direction": event.direction,
            "from": event.from_number,
            "to": event.to_number
        }

        # Log to Convex
        self.log_to_convex({
            "callId": event.call_id,
            "direction": event.direction,
            "from": event.from_number,
            "to": event.to_number,
            "startTime": self._parse_timestamp(event.timestamp),
            "status": CallStatus.IN_PROGRESS.value
        })

        # Check if caller exists in leads database
        self._check_existing_lead(event.from_number)

        return {
            "status": "processing",
            "call_id": event.call_id,
            "message": "Call started successfully"
        }

    def _handle_call_end(self, event: CallEvent) -> Dict[str, Any]:
        """Handle call end event."""
        call_data = self.active_calls.get(event.call_id, {})

        # Process transcript if available
        analysis_result = None
        if event.transcript:
            analysis_result = self.process_transcript(event.call_id, event.transcript)

        # Calculate lead score
        lead_score = 0
        booking_scheduled = False
        if analysis_result:
            lead_score = self.update_lead_score(event.call_id, analysis_result)
            booking_scheduled = analysis_result.get("booking_intent", False)

        # Update Convex with call results
        self.convex.mutation("voiceCalls/update", {
            "callId": event.call_id,
            "endTime": self._parse_timestamp(event.timestamp),
            "duration": event.duration,
            "status": CallStatus.COMPLETED.value,
            "recordingUrl": event.recording_url,
            "transcription": event.transcript,
            "summary": analysis_result.get("summary") if analysis_result else None,
            "sentiment": analysis_result.get("sentiment") if analysis_result else None,
            "aiNotes": {
                "keyPoints": analysis_result.get("pain_points", []) if analysis_result else [],
                "nextSteps": analysis_result.get("next_steps", []) if analysis_result else [],
                "concerns": analysis_result.get("objections", []) if analysis_result else [],
                "opportunities": analysis_result.get("opportunities", []) if analysis_result else []
            } if analysis_result else None
        })

        # Update lead if identified
        if call_data.get("lead_id"):
            self._update_lead_after_call(
                call_data["lead_id"],
                lead_score,
                analysis_result
            )

        # Clean up active call tracking
        if event.call_id in self.active_calls:
            del self.active_calls[event.call_id]

        return {
            "status": "completed",
            "call_id": event.call_id,
            "duration": event.duration,
            "lead_score": lead_score,
            "booking_scheduled": booking_scheduled,
            "sentiment": analysis_result.get("sentiment") if analysis_result else None
        }

    def _handle_transfer_start(self, event: CallEvent) -> Dict[str, Any]:
        """Handle call transfer event."""
        # Update call status
        if event.call_id in self.active_calls:
            self.active_calls[event.call_id]["status"] = CallStatus.TRANSFERRED.value

        # Initiate transfer
        transfer_result = self.initiate_transfer(
            event.call_id,
            event.transfer_to,
            event.reason
        )

        # Log transfer event
        self.convex.mutation("voiceCalls/addTransferEvent", {
            "callId": event.call_id,
            "transferTo": event.transfer_to,
            "reason": event.reason,
            "timestamp": self._parse_timestamp(event.timestamp)
        })

        return {
            "status": "transferring",
            "call_id": event.call_id,
            "transfer_to": event.transfer_to,
            "transfer_initiated": transfer_result.get("success", False)
        }

    def _handle_call_failed(self, event: CallEvent) -> Dict[str, Any]:
        """Handle failed call event."""
        # Log failure
        self.log_to_convex({
            "callId": event.call_id,
            "status": CallStatus.FAILED.value,
            "error": event.reason,
            "timestamp": self._parse_timestamp(event.timestamp)
        })

        # Clean up active call
        if event.call_id in self.active_calls:
            del self.active_calls[event.call_id]

        return {
            "status": "failed",
            "call_id": event.call_id,
            "reason": event.reason
        }

    def _handle_transcript_update(self, event: CallEvent) -> Dict[str, Any]:
        """Handle real-time transcript update."""
        # Store partial transcript
        if event.call_id in self.active_calls:
            self.active_calls[event.call_id]["partial_transcript"] = event.transcript

        # Analyze for real-time insights
        if event.transcript:
            insights = self._analyze_partial_transcript(event.transcript)

            # Check if transfer is needed
            if insights.get("needs_transfer"):
                self._request_transfer(event.call_id, insights.get("transfer_reason"))

        return {
            "status": "transcript_updated",
            "call_id": event.call_id
        }

    def _handle_function_call(self, event: CallEvent) -> Dict[str, Any]:
        """Handle function calls from the voice agent."""
        function_name = event.metadata.get("function")
        parameters = event.metadata.get("parameters", {})

        function_handlers = {
            "scheduleDiscoveryCall": self._schedule_discovery_call,
            "checkAvailability": self._check_availability,
            "createLeadNote": self._create_lead_note
        }

        handler = function_handlers.get(function_name)
        if handler:
            result = handler(event.call_id, parameters)
            return {
                "status": "function_executed",
                "function": function_name,
                "result": result
            }

        return {
            "status": "function_not_found",
            "function": function_name
        }

    def process_transcript(self, call_id: str, transcript: str) -> Dict[str, Any]:
        """Process call transcript for insights.

        Args:
            call_id: Call identifier
            transcript: Full call transcript

        Returns:
            Analysis results
        """
        # Import transcript processor
        from .transcript_processor import TranscriptProcessor

        processor = TranscriptProcessor()
        analysis = processor.analyze_transcript(transcript)

        return {
            "call_id": call_id,
            "summary": analysis.summary,
            "pain_points": analysis.pain_points,
            "next_steps": analysis.next_steps,
            "objections": analysis.objections,
            "opportunities": analysis.opportunities,
            "sentiment": analysis.sentiment,
            "booking_intent": analysis.intent_to_book,
            "qualification_signals": analysis.qualification_signals
        }

    def update_lead_score(self, call_id: str, analysis: Dict[str, Any]) -> int:
        """Update lead score based on call analysis.

        Args:
            call_id: Call identifier
            analysis: Call analysis results

        Returns:
            Updated lead score
        """
        # Import lead scoring engine
        from ..ai_analysis.lead_scoring import LeadScoringEngine, QualificationFactors

        engine = LeadScoringEngine()

        factors = QualificationFactors(
            pain_points=analysis.get("pain_points", []),
            sentiment=analysis.get("sentiment", "neutral"),
            engagement_level=self._determine_engagement_level(analysis),
            questions_asked=len(analysis.get("questions", [])),
            objections_raised=len(analysis.get("objections", [])),
            booking_intent=analysis.get("booking_intent", False),
            **analysis.get("qualification_signals", {})
        )

        score_result = engine.calculate_score(factors)

        # Update lead in database
        self.convex.mutation("leads/updateScore", {
            "callId": call_id,
            "score": score_result.total,
            "category": score_result.category,
            "recommendation": score_result.recommendation
        })

        return score_result.total

    def initiate_transfer(self, call_id: str, transfer_to: str,
                         reason: str) -> Dict[str, Any]:
        """Initiate call transfer.

        Args:
            call_id: Call to transfer
            transfer_to: Transfer destination
            reason: Reason for transfer

        Returns:
            Transfer result
        """
        # Call Vapi API to transfer
        response = requests.post(
            f"{self.vapi_base_url}/calls/{call_id}/transfer",
            json={
                "transferTo": transfer_to,
                "reason": reason,
                "warmTransfer": True
            },
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
        )

        if response.status_code == 200:
            return {"success": True, "message": "Transfer initiated"}
        else:
            return {"success": False, "error": response.text}

    def log_to_convex(self, data: Dict[str, Any]) -> None:
        """Log call data to Convex database.

        Args:
            data: Data to log
        """
        try:
            self.convex.mutation("voiceCalls/create", data)
        except Exception as e:
            print(f"Error logging to Convex: {e}")

    def _check_existing_lead(self, phone_number: str) -> Optional[str]:
        """Check if caller is an existing lead.

        Args:
            phone_number: Caller's phone number

        Returns:
            Lead ID if exists
        """
        try:
            result = self.convex.query("leads/getByPhone", {"phone": phone_number})
            if result and result.get("_id"):
                return result["_id"]
        except Exception:
            pass
        return None

    def _update_lead_after_call(self, lead_id: str, score: int,
                               analysis: Dict[str, Any]) -> None:
        """Update lead record after call.

        Args:
            lead_id: Lead identifier
            score: Updated lead score
            analysis: Call analysis results
        """
        update_data = {
            "leadId": lead_id,
            "score": score,
            "lastContactDate": datetime.now().isoformat(),
            "notes": analysis.get("summary", ""),
            "tags": self._extract_tags(analysis),
            "status": self._determine_lead_status(score, analysis)
        }

        if analysis.get("booking_intent"):
            update_data["nextFollowUp"] = self._calculate_follow_up_date()

        self.convex.mutation("leads/update", update_data)

    def _analyze_partial_transcript(self, transcript: str) -> Dict[str, Any]:
        """Analyze partial transcript for real-time decisions.

        Args:
            transcript: Partial transcript

        Returns:
            Real-time insights
        """
        insights = {
            "needs_transfer": False,
            "transfer_reason": None,
            "customer_frustrated": False,
            "technical_depth": False
        }

        # Check for transfer triggers
        transfer_triggers = [
            "speak to a person",
            "talk to Matthew",
            "technical architecture",
            "database design",
            "can I speak with someone"
        ]

        for trigger in transfer_triggers:
            if trigger.lower() in transcript.lower():
                insights["needs_transfer"] = True
                insights["transfer_reason"] = "Customer requested human agent"
                break

        # Check for frustration
        frustration_signals = ["frustrated", "annoyed", "this isn't working", "waste of time"]
        for signal in frustration_signals:
            if signal in transcript.lower():
                insights["customer_frustrated"] = True
                insights["needs_transfer"] = True
                insights["transfer_reason"] = "Customer frustration detected"
                break

        return insights

    def _schedule_discovery_call(self, call_id: str,
                                parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Schedule a discovery call with Matthew.

        Args:
            call_id: Current call ID
            parameters: Scheduling parameters

        Returns:
            Scheduling result
        """
        # Create calendar event (integrate with actual calendar system)
        event_data = {
            "title": f"Discovery Call - {parameters.get('customerName')}",
            "company": parameters.get("companyName"),
            "preferredTime": parameters.get("preferredTime"),
            "painPoint": parameters.get("mainPainPoint"),
            "callId": call_id
        }

        # Log to database
        self.convex.mutation("appointments/create", event_data)

        return {
            "scheduled": True,
            "message": f"Discovery call scheduled for {parameters.get('preferredTime')}"
        }

    def _check_availability(self, call_id: str,
                          parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Check calendar availability.

        Args:
            call_id: Current call ID
            parameters: Date range parameters

        Returns:
            Available time slots
        """
        # Query availability (integrate with actual calendar)
        date_range = parameters.get("dateRange", "this week")

        # Mock availability for now
        available_slots = [
            "Thursday at 2 PM PST",
            "Friday at 10 AM PST",
            "Next Monday at 3 PM PST"
        ]

        return {
            "available": True,
            "slots": available_slots
        }

    def _create_lead_note(self, call_id: str,
                        parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Create a lead note.

        Args:
            call_id: Current call ID
            parameters: Note parameters

        Returns:
            Note creation result
        """
        note_data = {
            "callId": call_id,
            "painPoints": parameters.get("painPoints", []),
            "qualificationScore": parameters.get("qualificationScore", 0),
            "notes": parameters.get("notes", ""),
            "timestamp": datetime.now().isoformat()
        }

        self.convex.mutation("leads/addNote", note_data)

        return {
            "created": True,
            "message": "Lead note created successfully"
        }

    def _determine_engagement_level(self, analysis: Dict[str, Any]) -> str:
        """Determine engagement level from analysis."""
        question_count = len(analysis.get("questions", []))
        if question_count >= 5:
            return "high"
        elif question_count >= 2:
            return "medium"
        return "low"

    def _extract_tags(self, analysis: Dict[str, Any]) -> List[str]:
        """Extract relevant tags from analysis."""
        tags = []

        # Add pain point tags
        for pain in analysis.get("pain_points", []):
            if "lead" in pain.lower():
                tags.append("lead-management")
            if "website" in pain.lower():
                tags.append("website-improvement")
            if "automat" in pain.lower():
                tags.append("automation")

        # Add sentiment tag
        sentiment = analysis.get("sentiment", "neutral")
        if sentiment == "positive":
            tags.append("hot-lead")
        elif sentiment == "negative":
            tags.append("needs-nurturing")

        return tags

    def _determine_lead_status(self, score: int,
                              analysis: Dict[str, Any]) -> str:
        """Determine lead status based on score and analysis."""
        if analysis.get("booking_intent"):
            return "qualified"
        elif score >= 70:
            return "qualified"
        elif score >= 40:
            return "contacted"
        else:
            return "new"

    def _calculate_follow_up_date(self) -> int:
        """Calculate next follow-up timestamp."""
        # Follow up in 2 days
        return int((datetime.now().timestamp() + (2 * 24 * 60 * 60)) * 1000)

    def _parse_timestamp(self, timestamp: str) -> int:
        """Parse timestamp to milliseconds."""
        try:
            dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
            return int(dt.timestamp() * 1000)
        except:
            return int(datetime.now().timestamp() * 1000)

    def _request_transfer(self, call_id: str, reason: str) -> None:
        """Request call transfer."""
        # Send transfer request via API
        self.executor.submit(
            self.initiate_transfer,
            call_id,
            "matthew",  # Default transfer to Matthew
            reason
        )