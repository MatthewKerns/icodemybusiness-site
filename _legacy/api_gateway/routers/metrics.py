"""
Business metrics endpoints for Agent-OS compatibility.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import logging

from services.convex_client import get_convex_client, get_mock_convex_client
import os

logger = logging.getLogger(__name__)

router = APIRouter()


async def calculate_metrics(client) -> Dict[str, Any]:
    """
    Calculate comprehensive business metrics from Convex data.

    Args:
        client: Convex client instance

    Returns:
        Business metrics in Agent-OS format
    """
    # Fetch all necessary data
    clients_data = await client.query("clients:list", {})
    projects_data = await client.query("projects:list", {})
    deliverables_data = await client.query("deliverables:list", {})
    messages_data = await client.query("messages:list", {})

    # Calculate revenue metrics
    active_clients = [c for c in clients_data if c.get("status") == "active"]
    mrr = sum(c.get("monthlyRecurring", 0) for c in active_clients)
    arr = mrr * 12

    # Calculate growth (mock - would need historical data)
    growth_rate = 12.5  # Mock percentage

    # Calculate churn (mock - would need historical data)
    churn_rate = 2.1  # Mock percentage

    # New MRR this month (mock)
    new_mrr = 3500 if len(active_clients) > 0 else 0

    # Project metrics
    active_projects = [p for p in projects_data if p.get("status") == "in_progress"]
    completed_projects = [p for p in projects_data if p.get("status") == "completed"]
    planning_projects = [p for p in projects_data if p.get("status") == "planning"]

    # Calculate average project value
    project_values = [p.get("budget", 0) for p in projects_data if p.get("budget")]
    avg_project_value = sum(project_values) / len(project_values) if project_values else 0

    # Calculate on-time delivery rate
    completed_with_dates = [
        p for p in completed_projects
        if p.get("completedDate") and p.get("dueDate")
    ]
    on_time = sum(
        1 for p in completed_with_dates
        if p.get("completedDate", 0) <= p.get("dueDate", 0)
    )
    on_time_rate = (on_time / len(completed_with_dates) * 100) if completed_with_dates else 0

    # Client metrics
    total_clients = len(clients_data)
    active_client_count = len(active_clients)
    new_clients = len([
        c for c in clients_data
        if c.get("createdAt") and
        datetime.fromtimestamp(c["createdAt"] / 1000) >= datetime.now() - timedelta(days=30)
    ])

    # Calculate average LTV (mock)
    avg_ltv = mrr * 18 if active_client_count > 0 else 0  # Assume 18-month average retention

    # Calculate NPS (mock - would need survey data)
    nps_score = 72

    # Productivity metrics
    completed_deliverables = [
        d for d in deliverables_data
        if d.get("status") == "delivered" and d.get("completedDate") and
        datetime.fromtimestamp(d["completedDate"] / 1000) >= datetime.now() - timedelta(days=7)
    ]

    # Mock productivity values
    hours_this_week = 32
    billable_hours = 28
    utilization_rate = (billable_hours / 40) * 100 if hours_this_week > 0 else 0
    tasks_completed = len(completed_deliverables)
    avg_task_time = 1.3  # Mock hours

    # Pipeline metrics (mock - would integrate with CRM)
    leads_count = 12
    qualified_leads = 5
    proposals_sent = 3
    conversion_rate = 35  # Mock percentage
    avg_deal_size = 15000
    pipeline_value = qualified_leads * avg_deal_size

    return {
        "revenue": {
            "mrr": mrr,
            "arr": arr,
            "growth": growth_rate,
            "churn": churn_rate,
            "newMrrThisMonth": new_mrr,
            "churnedMrrThisMonth": 0
        },
        "projects": {
            "active": len(active_projects),
            "completed": len(completed_projects),
            "inPipeline": len(planning_projects),
            "averageValue": avg_project_value,
            "averageCompletionTime": 21,  # Mock days
            "onTimeDelivery": on_time_rate
        },
        "clients": {
            "total": total_clients,
            "active": active_client_count,
            "new": new_clients,
            "churnedThisQuarter": 0,
            "averageLTV": avg_ltv,
            "nps": nps_score
        },
        "productivity": {
            "hoursThisWeek": hours_this_week,
            "billableHours": billable_hours,
            "utilizationRate": utilization_rate,
            "tasksCompleted": tasks_completed,
            "averageTaskTime": avg_task_time
        },
        "pipeline": {
            "leads": leads_count,
            "qualifiedLeads": qualified_leads,
            "proposalsSent": proposals_sent,
            "conversionRate": conversion_rate,
            "averageDealSize": avg_deal_size,
            "estimatedPipelineValue": pipeline_value
        }
    }


@router.get("")
async def get_metrics(
    period: Optional[str] = Query("current", description="Time period (current, monthly, quarterly, yearly)")
) -> Dict[str, Any]:
    """
    Get comprehensive business metrics.

    Returns:
        Business metrics in Agent-OS format
    """
    try:
        # Use mock client in development if Convex not configured
        if os.getenv("CONVEX_URL"):
            client = get_convex_client()
        else:
            client = get_mock_convex_client()

        # Calculate metrics
        metrics = await calculate_metrics(client)

        # Add period-specific adjustments if needed
        if period == "monthly":
            # Adjust metrics for monthly view
            metrics["period"] = "monthly"
        elif period == "quarterly":
            # Adjust metrics for quarterly view
            metrics["period"] = "quarterly"
            metrics["revenue"]["mrr"] = metrics["revenue"]["mrr"] * 3
        elif period == "yearly":
            # Adjust metrics for yearly view
            metrics["period"] = "yearly"

        return {
            "success": True,
            "data": metrics,
            "generatedAt": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error fetching metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/revenue")
async def get_revenue_metrics() -> Dict[str, Any]:
    """
    Get detailed revenue metrics.

    Returns:
        Revenue-specific metrics
    """
    try:
        # Use mock client in development if Convex not configured
        if os.getenv("CONVEX_URL"):
            client = get_convex_client()
        else:
            client = get_mock_convex_client()

        # Get all metrics
        all_metrics = await calculate_metrics(client)

        # Extract and enhance revenue metrics
        revenue_metrics = all_metrics["revenue"]

        # Add historical data (mock)
        revenue_metrics["history"] = [
            {"month": "January", "mrr": 10000, "growth": 10},
            {"month": "February", "mrr": 11000, "growth": 10},
            {"month": "March", "mrr": 13500, "growth": 22.7}
        ]

        # Add revenue by client tier (mock)
        revenue_metrics["byTier"] = {
            "enterprise": 8000,
            "growth": 3500,
            "starter": 2000
        }

        # Add revenue forecast (mock)
        revenue_metrics["forecast"] = {
            "nextMonth": 15000,
            "nextQuarter": 48000,
            "nextYear": 200000
        }

        return {
            "success": True,
            "data": revenue_metrics,
            "generatedAt": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error fetching revenue metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance")
async def get_performance_metrics() -> Dict[str, Any]:
    """
    Get performance and productivity metrics.

    Returns:
        Performance-specific metrics
    """
    try:
        # Use mock client in development if Convex not configured
        if os.getenv("CONVEX_URL"):
            client = get_convex_client()
        else:
            client = get_mock_convex_client()

        # Get deliverables and projects
        deliverables = await client.query("deliverables:list", {})
        projects = await client.query("projects:list", {})

        # Calculate performance metrics
        week_start = datetime.now() - timedelta(days=7)
        month_start = datetime.now() - timedelta(days=30)

        # Weekly performance
        weekly_deliverables = [
            d for d in deliverables
            if d.get("completedDate") and
            datetime.fromtimestamp(d["completedDate"] / 1000) >= week_start
        ]

        # Monthly performance
        monthly_deliverables = [
            d for d in deliverables
            if d.get("completedDate") and
            datetime.fromtimestamp(d["completedDate"] / 1000) >= month_start
        ]

        # Response time metrics (mock)
        avg_response_time = 2.5  # hours
        avg_resolution_time = 24  # hours

        performance_data = {
            "weekly": {
                "tasksCompleted": len(weekly_deliverables),
                "projectsAdvanced": len([p for p in projects if p.get("status") == "in_progress"]),
                "clientInteractions": 15,  # Mock
                "averageResponseTime": avg_response_time
            },
            "monthly": {
                "tasksCompleted": len(monthly_deliverables),
                "projectsCompleted": len([p for p in projects if p.get("status") == "completed"]),
                "clientSatisfaction": 4.5,  # Mock rating out of 5
                "averageResolutionTime": avg_resolution_time
            },
            "quality": {
                "bugRate": 2.1,  # Mock percentage
                "reworkRate": 5.0,  # Mock percentage
                "clientApprovalRate": 95,  # Mock percentage
                "codeReviewScore": 8.5  # Mock score out of 10
            },
            "efficiency": {
                "automationSavings": 15,  # Mock hours per week
                "processOptimization": 23,  # Mock percentage improvement
                "toolUtilization": 87  # Mock percentage
            }
        }

        return {
            "success": True,
            "data": performance_data,
            "generatedAt": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error fetching performance metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard")
async def get_dashboard_metrics() -> Dict[str, Any]:
    """
    Get condensed metrics for dashboard display.

    Returns:
        Dashboard-optimized metrics
    """
    try:
        # Use mock client in development if Convex not configured
        if os.getenv("CONVEX_URL"):
            client = get_convex_client()
        else:
            client = get_mock_convex_client()

        # Get all metrics
        all_metrics = await calculate_metrics(client)

        # Create dashboard-specific view
        dashboard_data = {
            "kpis": {
                "mrr": all_metrics["revenue"]["mrr"],
                "activeProjects": all_metrics["projects"]["active"],
                "activeClients": all_metrics["clients"]["active"],
                "utilizationRate": all_metrics["productivity"]["utilizationRate"]
            },
            "trends": {
                "revenueGrowth": all_metrics["revenue"]["growth"],
                "clientGrowth": 15,  # Mock percentage
                "projectGrowth": 20   # Mock percentage
            },
            "alerts": [],
            "recentActivity": []
        }

        # Add alerts based on metrics
        if all_metrics["productivity"]["utilizationRate"] < 70:
            dashboard_data["alerts"].append({
                "type": "warning",
                "message": "Utilization rate below target",
                "value": all_metrics["productivity"]["utilizationRate"]
            })

        if all_metrics["revenue"]["churn"] > 5:
            dashboard_data["alerts"].append({
                "type": "danger",
                "message": "High churn rate detected",
                "value": all_metrics["revenue"]["churn"]
            })

        # Add recent activity (mock)
        dashboard_data["recentActivity"] = [
            {
                "type": "client",
                "action": "New client onboarded",
                "timestamp": (datetime.now() - timedelta(hours=2)).isoformat()
            },
            {
                "type": "project",
                "action": "Dashboard Redesign milestone completed",
                "timestamp": (datetime.now() - timedelta(hours=5)).isoformat()
            },
            {
                "type": "communication",
                "action": "5 new messages received",
                "timestamp": (datetime.now() - timedelta(hours=1)).isoformat()
            }
        ]

        return {
            "success": True,
            "data": dashboard_data,
            "generatedAt": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error fetching dashboard metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))