"""
Agent-OS briefing endpoints for daily summaries and insights.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging

from services.convex_client import get_convex_client, get_mock_convex_client
import os

logger = logging.getLogger(__name__)

router = APIRouter()


def generate_daily_briefing(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a daily briefing from various data sources.

    Args:
        data: Combined data from projects, messages, appointments, etc.

    Returns:
        Structured daily briefing for Agent-OS
    """
    # Extract priorities
    priorities = []

    # Add urgent projects
    for project in data.get("projects", []):
        if project.get("status") == "in_progress":
            due_date = project.get("dueDate")
            if due_date:
                days_until_due = (datetime.fromisoformat(due_date.replace("Z", "+00:00")) - datetime.now()).days
                if days_until_due <= 7:
                    priorities.append({
                        "type": "project",
                        "title": f"Complete {project.get('name')}",
                        "client": project.get("clientName"),
                        "deadline": due_date,
                        "priority": project.get("priority", "medium")
                    })

    # Add unread messages requiring response
    for message in data.get("messages", []):
        if not message.get("isRead") and message.get("requiresResponse"):
            priorities.append({
                "type": "communication",
                "title": f"Respond to {message.get('from', {}).get('name', 'Unknown')}",
                "client": message.get("clientName"),
                "subject": message.get("subject"),
                "received": message.get("createdAt"),
                "priority": "high" if message.get("clientTier") == "enterprise" else "medium"
            })

    # Add upcoming meetings
    for appointment in data.get("appointments", []):
        start_time = appointment.get("startTime")
        if start_time:
            hours_until = (datetime.fromisoformat(start_time.replace("Z", "+00:00")) - datetime.now()).total_seconds() / 3600
            if 0 < hours_until <= 24:
                priorities.append({
                    "type": "meeting",
                    "title": appointment.get("title"),
                    "client": appointment.get("clientName"),
                    "time": start_time,
                    "priority": "high" if hours_until <= 2 else "medium"
                })

    # Sort priorities by importance
    priority_order = {"high": 0, "medium": 1, "low": 2}
    priorities.sort(key=lambda x: priority_order.get(x.get("priority", "low"), 2))

    # Calculate metrics
    active_projects = len([p for p in data.get("projects", []) if p.get("status") == "in_progress"])
    pending_tasks = len([d for d in data.get("deliverables", []) if d.get("status") in ["pending", "in_progress"]])
    unread_messages = len([m for m in data.get("messages", []) if not m.get("isRead")])
    upcoming_meetings = len([a for a in data.get("appointments", []) if a.get("status") == "scheduled"])

    # Calculate monthly revenue
    monthly_revenue = sum(c.get("monthlyRecurring", 0) for c in data.get("clients", []) if c.get("status") == "active")

    return {
        "date": datetime.now().isoformat(),
        "company": "iCodeMyBusiness",
        "summary": {
            "activeProjects": active_projects,
            "pendingTasks": pending_tasks,
            "clientRequests": unread_messages,
            "upcomingMeetings": upcoming_meetings,
            "revenueThisMonth": monthly_revenue
        },
        "priorities": priorities[:10],  # Top 10 priorities
        "communications": [
            {
                "from": msg.get("from", {}).get("name", "Unknown"),
                "type": msg.get("channel", "email"),
                "subject": msg.get("subject", "No subject"),
                "preview": msg.get("body", "")[:100] + "..." if len(msg.get("body", "")) > 100 else msg.get("body", ""),
                "received": msg.get("createdAt"),
                "requiresResponse": msg.get("requiresResponse", False)
            }
            for msg in data.get("messages", [])[:5] if not msg.get("isRead")
        ],
        "metrics": {
            "weeklyProgress": calculate_weekly_progress(data),
            "clientHealth": calculate_client_health(data.get("clients", []))
        }
    }


def calculate_weekly_progress(data: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate weekly progress metrics."""
    # Get tasks completed this week
    week_start = datetime.now() - timedelta(days=7)

    completed_tasks = [
        d for d in data.get("deliverables", [])
        if d.get("status") == "delivered" and d.get("completedDate")
        and datetime.fromisoformat(d["completedDate"].replace("Z", "+00:00")) >= week_start
    ]

    total_tasks = len(data.get("deliverables", []))

    return {
        "tasksCompleted": len(completed_tasks),
        "tasksTotal": total_tasks,
        "hoursWorked": 32,  # Mock value - would calculate from time tracking
        "hoursPlanned": 40
    }


def calculate_client_health(clients: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Calculate health scores for active clients."""
    health_scores = []

    for client in clients:
        if client.get("status") == "active":
            # Calculate trend based on recent activity
            trend = "stable"  # Mock - would analyze historical data

            health_scores.append({
                "client": client.get("companyName"),
                "score": client.get("healthScore", 75),
                "trend": trend
            })

    return sorted(health_scores, key=lambda x: x["score"], reverse=True)[:5]


@router.get("/daily")
async def get_daily_briefing() -> Dict[str, Any]:
    """
    Get daily briefing for Agent-OS.

    Returns:
        Comprehensive daily briefing with priorities and metrics
    """
    try:
        # Use mock client in development if Convex not configured
        if os.getenv("CONVEX_URL"):
            client = get_convex_client()
        else:
            client = get_mock_convex_client()

        # Gather all necessary data
        data = {}

        # Get active projects
        projects = await client.query("projects:list", {"status": "in_progress"})

        # Get client information for projects
        client_ids = list(set(p.get("clientId") for p in projects if p.get("clientId")))
        clients_map = {}
        for cid in client_ids:
            client_data = await client.query("clients:get", {"id": cid})
            if client_data:
                clients_map[cid] = client_data

        # Enrich projects with client names
        for project in projects:
            client_data = clients_map.get(project.get("clientId"))
            if client_data:
                project["clientName"] = client_data.get("companyName")
                project["clientTier"] = client_data.get("tier")

        data["projects"] = projects

        # Get all active clients
        data["clients"] = await client.query("clients:list", {"status": "active"})
        for c in data["clients"]:
            # Add mock health score
            c["healthScore"] = 75 + (hash(c.get("_id", "")) % 25)

        # Get recent messages
        messages = await client.query("messages:list", {"isRead": False})

        # Enrich messages with client information
        for message in messages:
            if message.get("clientId"):
                client_data = await client.query("clients:get", {"id": message["clientId"]})
                if client_data:
                    message["clientName"] = client_data.get("companyName")
                    message["clientTier"] = client_data.get("tier")

            # Add mock fields if not present
            if "requiresResponse" not in message:
                message["requiresResponse"] = message.get("direction") == "inbound"
            if "createdAt" not in message:
                message["createdAt"] = datetime.now().isoformat()

        data["messages"] = messages

        # Get pending deliverables
        data["deliverables"] = await client.query("deliverables:list", {"status": "in_progress"})

        # Mock appointments data (would come from calendar integration)
        data["appointments"] = [
            {
                "title": "Client Discovery Call",
                "clientName": "Potential - Sarah Chen",
                "startTime": (datetime.now() + timedelta(hours=3)).isoformat(),
                "status": "scheduled"
            }
        ]

        # Generate the briefing
        briefing = generate_daily_briefing(data)

        return {
            "success": True,
            "data": briefing
        }

    except Exception as e:
        logger.error(f"Error generating daily briefing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/weekly")
async def get_weekly_briefing() -> Dict[str, Any]:
    """
    Get weekly briefing summary.

    Returns:
        Weekly summary and insights
    """
    try:
        # Similar to daily but with weekly scope
        # This is a placeholder for future implementation
        return {
            "success": True,
            "data": {
                "date": datetime.now().isoformat(),
                "company": "iCodeMyBusiness",
                "period": "weekly",
                "summary": {
                    "projectsCompleted": 2,
                    "newClients": 1,
                    "revenue": 13500,
                    "hoursWorked": 156
                },
                "highlights": [
                    "Completed Dashboard Redesign for Arise Group",
                    "Onboarded new enterprise client",
                    "Achieved 95% on-time delivery rate"
                ]
            }
        }

    except Exception as e:
        logger.error(f"Error generating weekly briefing: {e}")
        raise HTTPException(status_code=500, detail=str(e))