"""
Deliverables tracking endpoints for Agent-OS compatibility.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

from services.convex_client import get_convex_client, get_mock_convex_client
import os

logger = logging.getLogger(__name__)

router = APIRouter()


def transform_deliverable_data(
    convex_deliverable: Dict[str, Any],
    project_name: Optional[str] = None,
    client_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Transform Convex deliverable data to Agent-OS format.

    Args:
        convex_deliverable: Deliverable data from Convex
        project_name: Name of the associated project
        client_name: Name of the associated client

    Returns:
        Transformed deliverable data for Agent-OS
    """
    return {
        "id": convex_deliverable.get("_id"),
        "name": convex_deliverable.get("name"),
        "projectId": convex_deliverable.get("projectId"),
        "projectName": project_name or "Unknown Project",
        "clientId": convex_deliverable.get("clientId"),
        "clientName": client_name or "Unknown Client",
        "type": convex_deliverable.get("type"),
        "status": convex_deliverable.get("status"),
        "assignedTo": convex_deliverable.get("assignedTo"),
        "dueDate": datetime.fromtimestamp(
            convex_deliverable.get("dueDate", 0) / 1000
        ).isoformat() if convex_deliverable.get("dueDate") else None,
        "completedDate": datetime.fromtimestamp(
            convex_deliverable.get("completedDate", 0) / 1000
        ).isoformat() if convex_deliverable.get("completedDate") else None,
        "fileUrl": convex_deliverable.get("fileUrl"),
        "version": convex_deliverable.get("version", 1),
        "feedback": convex_deliverable.get("feedback"),
        "description": convex_deliverable.get("description")
    }


@router.get("")
async def get_deliverables(
    projectId: Optional[str] = Query(None, description="Filter by project ID"),
    clientId: Optional[str] = Query(None, description="Filter by client ID"),
    status: Optional[str] = Query(None, description="Filter by status"),
    assignedTo: Optional[str] = Query(None, description="Filter by assignee"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page")
) -> Dict[str, Any]:
    """
    Get all deliverables with optional filtering.

    Returns:
        List of deliverables in Agent-OS format
    """
    try:
        # Use mock client in development if Convex not configured
        if os.getenv("CONVEX_URL"):
            client = get_convex_client()
        else:
            client = get_mock_convex_client()

        # Build query arguments
        query_args = {}
        if projectId:
            query_args["projectId"] = projectId
        if clientId:
            query_args["clientId"] = clientId
        if status:
            query_args["status"] = status
        if assignedTo:
            query_args["assignedTo"] = assignedTo

        # Query Convex
        deliverables = await client.query("deliverables:list", query_args)

        # Get project and client names for all deliverables
        project_ids = list(set(d.get("projectId") for d in deliverables if d.get("projectId")))
        client_ids = list(set(d.get("clientId") for d in deliverables if d.get("clientId")))

        projects = {}
        for pid in project_ids:
            project_data = await client.query("projects:get", {"id": pid})
            if project_data:
                projects[pid] = project_data.get("name", "Unknown")

        clients = {}
        for cid in client_ids:
            client_data = await client.query("clients:get", {"id": cid})
            if client_data:
                clients[cid] = client_data.get("companyName", "Unknown")

        # Transform to Agent-OS format
        transformed_deliverables = []
        for convex_deliverable in deliverables:
            project_name = projects.get(convex_deliverable.get("projectId"), "Unknown Project")
            client_name = clients.get(convex_deliverable.get("clientId"), "Unknown Client")
            transformed_deliverables.append(
                transform_deliverable_data(convex_deliverable, project_name, client_name)
            )

        # Apply pagination
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_deliverables = transformed_deliverables[start_idx:end_idx]

        return {
            "success": True,
            "data": paginated_deliverables,
            "total": len(transformed_deliverables),
            "page": page,
            "pages": (len(transformed_deliverables) + limit - 1) // limit
        }

    except Exception as e:
        logger.error(f"Error fetching deliverables: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{deliverable_id}")
async def get_deliverable(deliverable_id: str) -> Dict[str, Any]:
    """
    Get a single deliverable by ID.

    Args:
        deliverable_id: Deliverable identifier

    Returns:
        Detailed deliverable information
    """
    try:
        # Use mock client in development if Convex not configured
        if os.getenv("CONVEX_URL"):
            client = get_convex_client()
        else:
            client = get_mock_convex_client()

        # Query Convex for specific deliverable
        convex_deliverable = await client.query("deliverables:get", {"id": deliverable_id})

        if not convex_deliverable:
            raise HTTPException(status_code=404, detail="Deliverable not found")

        # Get project and client information
        project_data = await client.query("projects:get", {"id": convex_deliverable.get("projectId")})
        client_data = await client.query("clients:get", {"id": convex_deliverable.get("clientId")})

        project_name = project_data.get("name") if project_data else "Unknown Project"
        client_name = client_data.get("companyName") if client_data else "Unknown Client"

        # Transform to detailed Agent-OS format
        transformed = transform_deliverable_data(convex_deliverable, project_name, client_name)

        # Add revision history if available
        transformed["revisions"] = convex_deliverable.get("revisions", [])

        # Add related deliverables from the same project
        related = await client.query("deliverables:list", {"projectId": convex_deliverable.get("projectId")})
        transformed["relatedDeliverables"] = [
            {
                "id": d.get("_id"),
                "name": d.get("name"),
                "status": d.get("status")
            }
            for d in related if d.get("_id") != deliverable_id
        ][:5]  # Limit to 5 related items

        return {
            "success": True,
            "data": transformed
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching deliverable {deliverable_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))