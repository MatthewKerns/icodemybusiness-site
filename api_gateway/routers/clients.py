"""
Client management endpoints for Agent-OS compatibility.
"""

from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging

from services.convex_client import get_convex_client, get_mock_convex_client
import os

logger = logging.getLogger(__name__)

router = APIRouter()


def transform_client_data(convex_client: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform Convex client data to Agent-OS format.

    Args:
        convex_client: Client data from Convex

    Returns:
        Transformed client data for Agent-OS
    """
    # Calculate derived fields
    last_contact = datetime.fromtimestamp(convex_client.get("updatedAt", 0) / 1000)
    health_score = calculate_health_score({
        "lastContact": last_contact,
        "status": convex_client.get("status"),
        "monthlyRecurring": convex_client.get("monthlyRecurring", 0)
    })

    return {
        "id": convex_client.get("_id"),
        "name": convex_client.get("companyName"),
        "type": convex_client.get("status", "prospective"),
        "projects": 0,  # Will be calculated separately if needed
        "monthlyValue": convex_client.get("monthlyRecurring", 0),
        "lastContact": last_contact.isoformat(),
        "healthScore": health_score,
        "industry": convex_client.get("industry"),
        "contactName": convex_client.get("primaryContact", {}).get("name"),
        "contactEmail": convex_client.get("primaryContact", {}).get("email"),
        "contactPhone": convex_client.get("primaryContact", {}).get("phone"),
        "tier": convex_client.get("tier"),
        "startDate": datetime.fromtimestamp(
            convex_client.get("startDate", 0) / 1000
        ).isoformat() if convex_client.get("startDate") else None,
        "tags": convex_client.get("tags", [])
    }


def calculate_health_score(client_data: Dict[str, Any]) -> int:
    """
    Calculate client health score based on various factors.

    Args:
        client_data: Client information

    Returns:
        Health score between 0-100
    """
    score = 50  # Base score

    # Recent contact (within 7 days)
    if "lastContact" in client_data:
        days_since_contact = (datetime.now() - client_data["lastContact"]).days
        if days_since_contact <= 7:
            score += 20
        elif days_since_contact <= 14:
            score += 10
        elif days_since_contact > 30:
            score -= 10

    # Active status
    if client_data.get("status") == "active":
        score += 20
    elif client_data.get("status") == "paused":
        score -= 10
    elif client_data.get("status") == "churned":
        score = 0

    # Monthly recurring revenue
    mrr = client_data.get("monthlyRecurring", 0)
    if mrr > 5000:
        score += 15
    elif mrr > 2000:
        score += 10
    elif mrr > 0:
        score += 5

    # Ensure score is within bounds
    return max(0, min(100, score))


@router.get("")
async def get_clients(
    status: Optional[str] = Query(None, description="Filter by status"),
    tier: Optional[str] = Query(None, description="Filter by tier"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page")
) -> Dict[str, Any]:
    """
    Get all clients with optional filtering.

    Returns:
        List of clients in Agent-OS format
    """
    try:
        # Use mock client in development if Convex not configured
        if os.getenv("CONVEX_URL"):
            client = get_convex_client()
        else:
            client = get_mock_convex_client()

        # Build query arguments
        query_args = {}
        if status:
            query_args["status"] = status
        if tier:
            query_args["tier"] = tier

        # Query Convex
        clients = await client.query("clients:list", query_args)

        # Transform to Agent-OS format
        transformed_clients = []
        for convex_client in clients:
            # Apply search filter if provided
            if search:
                name_match = search.lower() in convex_client.get("companyName", "").lower()
                email_match = search.lower() in convex_client.get("primaryContact", {}).get("email", "").lower()
                if not (name_match or email_match):
                    continue

            transformed_clients.append(transform_client_data(convex_client))

        # Apply pagination
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_clients = transformed_clients[start_idx:end_idx]

        return {
            "success": True,
            "data": paginated_clients,
            "total": len(transformed_clients),
            "page": page,
            "pages": (len(transformed_clients) + limit - 1) // limit
        }

    except Exception as e:
        logger.error(f"Error fetching clients: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{client_id}")
async def get_client(client_id: str) -> Dict[str, Any]:
    """
    Get a single client by ID.

    Args:
        client_id: Client identifier

    Returns:
        Detailed client information
    """
    try:
        # Use mock client in development if Convex not configured
        if os.getenv("CONVEX_URL"):
            client = get_convex_client()
        else:
            client = get_mock_convex_client()

        # Query Convex for specific client
        convex_client = await client.query("clients:get", {"id": client_id})

        if not convex_client:
            raise HTTPException(status_code=404, detail="Client not found")

        # Get related projects for this client
        projects = await client.query("projects:list", {"clientId": client_id})

        # Transform to detailed Agent-OS format
        transformed = transform_client_data(convex_client)

        # Add project details
        transformed["projects"] = [
            {
                "id": p.get("_id"),
                "name": p.get("name"),
                "status": p.get("status")
            }
            for p in projects
        ]

        # Calculate total lifetime value
        if convex_client.get("startDate"):
            months_active = (
                datetime.now() - datetime.fromtimestamp(convex_client["startDate"] / 1000)
            ).days // 30
            transformed["totalLifetimeValue"] = months_active * transformed["monthlyValue"]
        else:
            transformed["totalLifetimeValue"] = 0

        # Add additional contacts if available
        if convex_client.get("additionalContacts"):
            transformed["additionalContacts"] = convex_client["additionalContacts"]

        # Add notes
        transformed["notes"] = convex_client.get("notes", "")

        return {
            "success": True,
            "data": transformed
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching client {client_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{client_id}/sync")
async def sync_client(
    client_id: str,
    background_tasks: BackgroundTasks
) -> Dict[str, Any]:
    """
    Trigger a sync for a specific client.

    Args:
        client_id: Client identifier
        background_tasks: FastAPI background tasks

    Returns:
        Sync status
    """
    try:
        # Add background task to sync client data
        background_tasks.add_task(sync_client_data, client_id)

        return {
            "success": True,
            "message": f"Sync initiated for client {client_id}",
            "status": "pending"
        }

    except Exception as e:
        logger.error(f"Error initiating sync for client {client_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def sync_client_data(client_id: str):
    """
    Background task to sync client data.

    Args:
        client_id: Client identifier
    """
    try:
        logger.info(f"Starting sync for client {client_id}")

        # In production, this would:
        # 1. Fetch latest data from external sources
        # 2. Update Convex database
        # 3. Send notifications if needed

        # For now, just log the action
        logger.info(f"Completed sync for client {client_id}")

    except Exception as e:
        logger.error(f"Error in background sync for client {client_id}: {e}")