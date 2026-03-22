"""
Lead creation logic for Calendly bookings
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from ..convex_client import convex
from ..config import config

logger = logging.getLogger(__name__)


class CalendlyLeadCreator:
    """Create and enrich leads from Calendly bookings"""

    # Score boosts based on event type and data
    SCORE_BOOSTS = {
        "enterprise": 15,
        "demo": 10,
        "strategy": 10,
        "consultation": 5,
        "high_budget": 15,
        "urgent_timeline": 10,
        "large_company": 10,
        "referred": 20
    }

    def __init__(self):
        self.convex = convex
        self.base_score = 70  # Calendly bookings start at 70

    async def create_lead_from_booking(
        self,
        name: str,
        email: str,
        event_id: str,
        event_time: int,
        event_type: str,
        company: Optional[str] = None,
        phone: Optional[str] = None,
        questions: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Create a high-scoring lead from Calendly booking

        Args:
            name: Contact name
            email: Contact email
            event_id: Calendly event ID
            event_time: Event timestamp in milliseconds
            event_type: Type of meeting booked
            company: Company name if provided
            phone: Phone number if provided
            questions: Q&A responses from booking form

        Returns:
            Created lead with ID and score
        """
        # Enrich lead data
        enriched = self._enrich_lead_data({
            "name": name,
            "email": email,
            "event_type": event_type,
            "company": company,
            "phone": phone,
            "questions": questions or {}
        })

        # Create lead in Convex with high score
        result = await self.convex.create_lead_from_calendly(
            name=name,
            email=email,
            event_id=event_id,
            event_time=event_time,
            event_type=event_type
        )

        # Update with enriched data if needed
        if enriched.get("score", 70) > 70:
            await self.convex.update_lead_score(
                lead_id=result.get("leadId"),
                score=enriched["score"]
            )
            result["score"] = enriched["score"]

        return result

    def _enrich_lead_data(self, booking_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enrich lead data and calculate score based on booking details

        Args:
            booking_data: Raw booking data

        Returns:
            Enriched data with calculated score and tags
        """
        score = self.base_score
        tags = []
        notes_parts = []

        event_type = booking_data.get("event_type", "").lower()
        questions = booking_data.get("questions", {})

        # Score based on event type
        if "enterprise" in event_type:
            score += self.SCORE_BOOSTS["enterprise"]
            tags.append("Enterprise")
        if "demo" in event_type:
            score += self.SCORE_BOOSTS["demo"]
            tags.append("Demo Requested")
        if "strategy" in event_type:
            score += self.SCORE_BOOSTS["strategy"]
            tags.append("Strategy Session")
        if "consultation" in event_type:
            score += self.SCORE_BOOSTS["consultation"]

        # Process Q&A responses
        for question, answer in questions.items():
            notes_parts.append(f"{question}: {answer}")

            # Score based on answers
            answer_lower = str(answer).lower()

            # Company size scoring
            if "company size" in question.lower():
                if any(x in answer_lower for x in ["500", "1000", "enterprise", "large"]):
                    score += self.SCORE_BOOSTS["large_company"]
                    tags.append("Large Company")

            # Budget scoring
            if "budget" in question.lower():
                if any(x in answer_lower for x in ["50k", "100k", "250k", "500k"]):
                    score += self.SCORE_BOOSTS["high_budget"]
                    tags.append("High Budget")

            # Timeline scoring
            if "timeline" in question.lower():
                if any(x in answer_lower for x in ["immediate", "urgent", "asap", "q1", "q2"]):
                    score += self.SCORE_BOOSTS["urgent_timeline"]
                    tags.append("Urgent Timeline")

            # Referral scoring
            if "referr" in question.lower() and answer:
                score += self.SCORE_BOOSTS["referred"]
                tags.append("Referred")

        # Ensure score doesn't exceed 100
        score = min(score, 100)

        return {
            "score": score,
            "tags": tags,
            "notes": "\n".join(notes_parts) if notes_parts else None
        }

    async def update_lead_for_rescheduling(
        self,
        lead_id: str,
        new_event_id: str,
        new_event_time: int
    ) -> Dict[str, Any]:
        """
        Update lead when booking is rescheduled

        Args:
            lead_id: Existing lead ID
            new_event_id: New Calendly event ID
            new_event_time: New event timestamp

        Returns:
            Update result
        """
        # Log the rescheduling
        await self.convex.log_activity(
            action="booking_rescheduled",
            entity_type="lead",
            entity_id=lead_id,
            entity_name="Lead",
            details={
                "new_event_id": new_event_id,
                "new_time": new_event_time
            }
        )

        return {"success": True, "lead_id": lead_id}

    async def handle_no_show(
        self,
        lead_id: str,
        event_id: str
    ) -> Dict[str, Any]:
        """
        Handle when invitee doesn't show up

        Args:
            lead_id: Lead ID
            event_id: Calendly event ID

        Returns:
            Update result with reduced score
        """
        # Reduce score for no-show
        current_score = 70  # Get from DB in production
        new_score = max(30, current_score - 20)

        await self.convex.update_lead_score(
            lead_id=lead_id,
            score=new_score
        )

        # Log the no-show
        await self.convex.log_activity(
            action="no_show",
            entity_type="lead",
            entity_id=lead_id,
            entity_name="Lead",
            details={
                "event_id": event_id,
                "score_reduction": 20
            }
        )

        return {
            "success": True,
            "lead_id": lead_id,
            "new_score": new_score
        }