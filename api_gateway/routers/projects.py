"""
Project management endpoints for Agent-OS compatibility.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging

from services.convex_client import get_convex_client, get_mock_convex_client
import os

logger = logging.getLogger(__name__)

router = APIRouter()


def transform_project_data(
    convex_project: Dict[str, Any],
    client_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Transform Convex project data to Agent-OS format.

    Args:
        convex_project: Project data from Convex
        client_name: Client name for the project

    Returns:
        Transformed project data for Agent-OS
    """
    # Calculate progress based on milestones or estimate
    progress = calculate_progress(convex_project.get("milestones", []))

    # Transform team members
    team = convex_project.get("teamMembers", [])
    if isinstance(team[0] if team else None, str):
        # If team members are just names/IDs, keep as is
        team_list = team
    else:
        # If team members are objects, extract names
        team_list = [member.get("name", member) for member in team]

    return {
        "id": convex_project.get("_id"),
        "name": convex_project.get("name"),
        "clientId": convex_project.get("clientId"),
        "clientName": client_name or "Unknown Client",
        "description": convex_project.get("description"),
        "status": convex_project.get("status"),
        "priority": convex_project.get("priority"),
        "type": convex_project.get("type"),
        "progress": progress,
        "dueDate": datetime.fromtimestamp(
            convex_project.get("dueDate", 0) / 1000
        ).isoformat() if convex_project.get("dueDate") else None,
        "startDate": datetime.fromtimestamp(
            convex_project.get("startDate", 0) / 1000
        ).isoformat() if convex_project.get("startDate") else None,
        "completedDate": datetime.fromtimestamp(
            convex_project.get("completedDate", 0) / 1000
        ).isoformat() if convex_project.get("completedDate") else None,
        "team": team_list,
        "budget": convex_project.get("budget", 0),
        "spent": convex_project.get("actualCost", 0),
        "milestones": convex_project.get("milestones", [])
    }


def calculate_progress(milestones: List[Dict[str, Any]]) -> int:
    """
    Calculate project progress based on milestones.

    Args:
        milestones: List of project milestones

    Returns:
        Progress percentage (0-100)
    """
    if not milestones:
        return 0

    completed = sum(1 for m in milestones if m.get("status") == "completed")
    total = len(milestones)

    return int((completed / total) * 100)


@router.get("")
async def get_projects(
    status: Optional[str] = Query(None, description="Filter by status"),
    clientId: Optional[str] = Query(None, description="Filter by client ID"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    type: Optional[str] = Query(None, description="Filter by project type"),
    sort: Optional[str] = Query("dueDate", description="Sort field"),
    order: Optional[str] = Query("asc", description="Sort order (asc/desc)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page")
) -> Dict[str, Any]:
    """
    Get all projects with optional filtering.

    Returns:
        List of projects in Agent-OS format
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
        if clientId:
            query_args["clientId"] = clientId
        if priority:
            query_args["priority"] = priority
        if type:
            query_args["type"] = type

        # Query Convex
        projects = await client.query("projects:list", query_args)

        # Get client names for all projects
        client_ids = list(set(p.get("clientId") for p in projects if p.get("clientId")))
        clients = {}
        for cid in client_ids:
            client_data = await client.query("clients:get", {"id": cid})
            if client_data:
                clients[cid] = client_data.get("companyName", "Unknown")

        # Transform to Agent-OS format
        transformed_projects = []
        for convex_project in projects:
            client_name = clients.get(convex_project.get("clientId"), "Unknown Client")
            transformed_projects.append(
                transform_project_data(convex_project, client_name)
            )

        # Sort projects
        if sort:
            reverse = order == "desc"
            if sort == "dueDate":
                transformed_projects.sort(
                    key=lambda x: x.get("dueDate", ""),
                    reverse=reverse
                )
            elif sort == "priority":
                priority_order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
                transformed_projects.sort(
                    key=lambda x: priority_order.get(x.get("priority", "low"), 3),
                    reverse=reverse
                )
            elif sort == "progress":
                transformed_projects.sort(
                    key=lambda x: x.get("progress", 0),
                    reverse=reverse
                )

        # Apply pagination
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_projects = transformed_projects[start_idx:end_idx]

        return {
            "success": True,
            "data": paginated_projects,
            "total": len(transformed_projects),
            "page": page,
            "pages": (len(transformed_projects) + limit - 1) // limit
        }

    except Exception as e:
        logger.error(f"Error fetching projects: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}")
async def get_project(project_id: str) -> Dict[str, Any]:
    """
    Get a single project by ID.

    Args:
        project_id: Project identifier

    Returns:
        Detailed project information
    """
    try:
        # Use mock client in development if Convex not configured
        if os.getenv("CONVEX_URL"):
            client = get_convex_client()
        else:
            client = get_mock_convex_client()

        # Query Convex for specific project
        convex_project = await client.query("projects:get", {"id": project_id})

        if not convex_project:
            raise HTTPException(status_code=404, detail="Project not found")

        # Get client information
        client_data = await client.query("clients:get", {"id": convex_project.get("clientId")})
        client_name = client_data.get("companyName") if client_data else "Unknown Client"

        # Get deliverables for this project
        deliverables = await client.query("deliverables:list", {"projectId": project_id})

        # Transform to detailed Agent-OS format
        transformed = transform_project_data(convex_project, client_name)

        # Add team details with roles
        if convex_project.get("teamMembers"):
            transformed["team"] = [
                {
                    "id": f"user_{idx}",
                    "name": member,
                    "role": "Developer"  # In production, fetch actual roles
                }
                for idx, member in enumerate(convex_project.get("teamMembers", []))
            ]

        # Add deliverables
        transformed["deliverables"] = [
            {
                "id": d.get("_id"),
                "name": d.get("name"),
                "status": d.get("status")
            }
            for d in deliverables
        ]

        # Calculate time tracked (mock calculation)
        if convex_project.get("startDate"):
            days_active = (
                datetime.now() - datetime.fromtimestamp(convex_project["startDate"] / 1000)
            ).days
            transformed["timeTracked"] = days_active * 6.5  # Mock hours calculation

        return {
            "success": True,
            "data": transformed
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))