"""
Convex client wrapper for integration services
"""

import asyncio
import httpx
from typing import Any, Dict, Optional
from tenacity import retry, stop_after_attempt, wait_exponential

from .config import config


class ConvexClient:
    """Client for interacting with Convex backend"""

    def __init__(self):
        self.base_url = config.convex_deployment_url
        self.headers = {
            "Authorization": f"Bearer {config.convex_api_key}",
            "Content-Type": "application/json"
        }

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def create_lead(
        self,
        name: str,
        email: Optional[str] = None,
        phone: Optional[str] = None,
        company: Optional[str] = None,
        source: str = "api",
        notes: Optional[str] = None,
        tags: Optional[list] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create a new lead in Convex"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/mutation",
                headers=self.headers,
                json={
                    "path": "leads:createLead",
                    "args": {
                        "name": name,
                        "email": email,
                        "phone": phone,
                        "company": company,
                        "source": source,
                        "notes": notes,
                        "tags": tags or [],
                        "metadata": metadata or {}
                    }
                }
            )
            response.raise_for_status()
            return response.json()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def create_lead_from_calendly(
        self,
        name: str,
        email: str,
        event_id: str,
        event_time: int,
        event_type: str
    ) -> Dict[str, Any]:
        """Create a lead from Calendly booking"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/mutation",
                headers=self.headers,
                json={
                    "path": "leads:createLeadFromCalendly",
                    "args": {
                        "name": name,
                        "email": email,
                        "eventId": event_id,
                        "eventTime": event_time,
                        "eventType": event_type
                    }
                }
            )
            response.raise_for_status()
            return response.json()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def update_lead_score(self, lead_id: str, score: int) -> Dict[str, Any]:
        """Update lead score"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/mutation",
                headers=self.headers,
                json={
                    "path": "leads:updateLeadScore",
                    "args": {
                        "id": lead_id,
                        "score": score
                    }
                }
            )
            response.raise_for_status()
            return response.json()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def create_client(
        self,
        company_name: str,
        contact_name: str,
        contact_email: str,
        contact_phone: Optional[str] = None,
        stripe_customer_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new client in Convex"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/mutation",
                headers=self.headers,
                json={
                    "path": "clients:create",
                    "args": {
                        "companyName": company_name,
                        "primaryContact": {
                            "name": contact_name,
                            "email": contact_email,
                            "phone": contact_phone
                        },
                        "status": "active",
                        "metadata": {
                            "stripeCustomerId": stripe_customer_id
                        } if stripe_customer_id else None
                    }
                }
            )
            response.raise_for_status()
            return response.json()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def log_activity(
        self,
        action: str,
        entity_type: str,
        entity_id: str,
        entity_name: str,
        details: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Log activity in Convex"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/mutation",
                headers=self.headers,
                json={
                    "path": "activityLogs:create",
                    "args": {
                        "action": action,
                        "entityType": entity_type,
                        "entityId": entity_id,
                        "entityName": entity_name,
                        "details": details or {}
                    }
                }
            )
            response.raise_for_status()
            return response.json()


# Global client instance
convex = ConvexClient()