"""
Email synchronization via Unipile API
"""

import logging
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from ..convex_client import convex
from ..config import config

logger = logging.getLogger(__name__)


class UnipileEmailSync:
    """Sync and process emails through Unipile"""

    def __init__(self):
        self.api_key = config.unipile_api_key
        self.api_url = config.unipile_api_url
        self.convex = convex
        self.processed_ids = set()

    async def sync_inbox(
        self,
        since_hours: int = 24,
        folder: str = "INBOX"
    ) -> List[Dict[str, Any]]:
        """
        Sync email inbox and create leads from new contacts

        Args:
            since_hours: Hours to look back for emails
            folder: Email folder to sync

        Returns:
            List of processed email results
        """
        # Fetch recent emails
        emails = await self._fetch_emails(since_hours, folder)
        results = []

        for email in emails:
            # Skip if already processed
            if email["id"] in self.processed_ids:
                continue

            # Check if potential lead
            if self._is_potential_lead(email):
                result = await self._create_lead_from_email(email)
                results.append(result)

            self.processed_ids.add(email["id"])

        return results

    async def _fetch_emails(
        self,
        since_hours: int,
        folder: str
    ) -> List[Dict[str, Any]]:
        """Fetch emails from Unipile API"""
        since_timestamp = (
            datetime.now() - timedelta(hours=since_hours)
        ).isoformat()

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/emails",
                headers={"Authorization": f"Bearer {self.api_key}"},
                params={
                    "folder": folder,
                    "since": since_timestamp,
                    "limit": 100
                }
            )
            response.raise_for_status()
            return response.json().get("emails", [])

    def _is_potential_lead(self, email: Dict[str, Any]) -> bool:
        """
        Determine if email is from a potential lead

        Args:
            email: Email data

        Returns:
            True if email appears to be from a lead
        """
        # Skip automated emails
        from_email = email.get("from", {}).get("email", "").lower()
        if any(x in from_email for x in ["noreply", "no-reply", "newsletter", "notification"]):
            return False

        # Check for lead indicators in subject/body
        subject = email.get("subject", "").lower()
        body = email.get("body", "").lower()

        lead_keywords = [
            "interested", "inquiry", "question", "proposal",
            "project", "services", "pricing", "quote",
            "consultation", "meeting", "discuss"
        ]

        return any(keyword in subject or keyword in body for keyword in lead_keywords)

    async def _create_lead_from_email(self, email: Dict[str, Any]) -> Dict[str, Any]:
        """Create a lead from email data"""
        from_data = email.get("from", {})

        result = await self.convex.create_lead(
            name=from_data.get("name", from_data.get("email", "Unknown")),
            email=from_data.get("email"),
            source="email",
            notes=f"Subject: {email.get('subject', '')}\n\nInitial message via email",
            metadata={
                "email_id": email.get("id"),
                "email_subject": email.get("subject")
            }
        )

        # Auto-reply if configured
        if config.environment != "production":  # Safety check
            await self.auto_reply_to_inquiry(email)

        return {
            "email_id": email["id"],
            "lead_id": result.get("leadId"),
            "action": "lead_created"
        }

    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        reply_to_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send email through Unipile

        Args:
            to: Recipient email
            subject: Email subject
            body: Email body (HTML supported)
            cc: CC recipients
            bcc: BCC recipients
            reply_to_id: ID of email being replied to

        Returns:
            Send result with message ID
        """
        payload = {
            "to": [to],
            "subject": subject,
            "body": body,
            "cc": cc or [],
            "bcc": bcc or []
        }

        if reply_to_id:
            payload["reply_to"] = reply_to_id

        return await self._send_via_api(payload)

    async def _send_via_api(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Send email via Unipile API"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/emails/send",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=payload
            )
            response.raise_for_status()
            data = response.json()

        return {
            "success": True,
            "message_id": data.get("message_id")
        }

    async def auto_reply_to_inquiry(
        self,
        email: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Send automatic reply to inquiry emails

        Args:
            email: Original email data

        Returns:
            Reply result
        """
        from_email = email.get("from", {}).get("email")
        from_name = email.get("from", {}).get("name", "there")

        auto_reply_body = f"""
        <p>Hi {from_name},</p>

        <p>Thank you for your interest in our services! We've received your inquiry and will get back to you within 24 hours.</p>

        <p>In the meantime, you can:</p>
        <ul>
            <li>Schedule a consultation: [Calendar Link]</li>
            <li>View our portfolio: [Portfolio Link]</li>
            <li>Learn about our process: [Process Link]</li>
        </ul>

        <p>Best regards,<br>
        The iCodeMyBusiness Team</p>
        """

        return await self.send_email(
            to=from_email,
            subject=f"Re: {email.get('subject', 'Your Inquiry')}",
            body=auto_reply_body,
            reply_to_id=email.get("id")
        )

    async def create_email_template(
        self,
        name: str,
        subject: str,
        body: str,
        variables: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create reusable email template

        Args:
            name: Template name
            subject: Template subject
            body: Template body with {variable} placeholders
            variables: List of variable names

        Returns:
            Template creation result
        """
        template = {
            "name": name,
            "subject": subject,
            "body": body,
            "variables": variables or [],
            "created_at": datetime.now().isoformat()
        }

        # Store template (implement storage logic)
        return {"success": True, "template": template}