"""Real-time project updates and live data streaming."""
import asyncio
import json
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
from enum import Enum
import logging

from .notifications import manager, Notification, NotificationType, NotificationPriority


logger = logging.getLogger(__name__)


class UpdateType(str, Enum):
    """Types of real-time updates."""
    PROJECT_METRICS = "project_metrics"
    TASK_PROGRESS = "task_progress"
    MILESTONE_STATUS = "milestone_status"
    TEAM_ACTIVITY = "team_activity"
    BUDGET_UPDATE = "budget_update"
    TIMELINE_CHANGE = "timeline_change"
    RESOURCE_ALLOCATION = "resource_allocation"


class LiveUpdate(BaseModel):
    """Live update model for real-time data."""
    id: str
    type: UpdateType
    project_id: str
    title: str
    data: Dict[str, Any]
    timestamp: datetime = datetime.now()
    user_id: Optional[str] = None
    metadata: Dict[str, Any] = {}


class MetricsUpdate(BaseModel):
    """Project metrics update."""
    project_id: str
    completion_percentage: float
    active_tasks: int
    completed_tasks: int
    open_issues: int
    budget_used_percentage: float
    health_score: float
    velocity: float  # Tasks completed per day
    estimated_completion: Optional[datetime] = None


class ActivityFeed(BaseModel):
    """Team activity feed item."""
    project_id: str
    user_id: str
    user_name: str
    action: str
    target_type: str  # task, document, comment, etc.
    target_id: str
    target_name: str
    timestamp: datetime
    details: Dict[str, Any] = {}


class ProjectUpdateStream:
    """Manages real-time project update streams."""

    def __init__(self):
        self.active_streams: Dict[str, asyncio.Task] = {}
        self.stream_intervals: Dict[str, int] = {}  # Update intervals in seconds
        self.stream_data: Dict[str, Dict[str, Any]] = {}  # Cached data for streams

    async def start_metrics_stream(self, project_id: str, interval: int = 30):
        """Start streaming project metrics at regular intervals."""
        if project_id in self.active_streams:
            logger.warning(f"Stream already active for project {project_id}")
            return

        self.stream_intervals[project_id] = interval

        async def stream_task():
            while True:
                try:
                    # Generate or fetch updated metrics
                    metrics = await self.fetch_project_metrics(project_id)

                    # Send update to all project subscribers
                    update = LiveUpdate(
                        id=f"update_{datetime.now().timestamp()}",
                        type=UpdateType.PROJECT_METRICS,
                        project_id=project_id,
                        title="Metrics Update",
                        data=metrics.dict()
                    )

                    await manager.send_project_message(
                        project_id,
                        {
                            "type": "live_update",
                            "update": update.dict()
                        }
                    )

                    await asyncio.sleep(interval)

                except asyncio.CancelledError:
                    break
                except Exception as e:
                    logger.error(f"Error in metrics stream for project {project_id}: {e}")
                    await asyncio.sleep(interval)

        self.active_streams[project_id] = asyncio.create_task(stream_task())
        logger.info(f"Started metrics stream for project {project_id}")

    async def stop_metrics_stream(self, project_id: str):
        """Stop streaming metrics for a project."""
        if project_id in self.active_streams:
            self.active_streams[project_id].cancel()
            del self.active_streams[project_id]
            logger.info(f"Stopped metrics stream for project {project_id}")

    async def fetch_project_metrics(self, project_id: str) -> MetricsUpdate:
        """Fetch current project metrics from data source."""
        # Mock implementation - replace with actual data fetching
        import random

        return MetricsUpdate(
            project_id=project_id,
            completion_percentage=random.uniform(40, 60),
            active_tasks=random.randint(10, 20),
            completed_tasks=random.randint(5, 15),
            open_issues=random.randint(0, 5),
            budget_used_percentage=random.uniform(30, 50),
            health_score=random.uniform(70, 95),
            velocity=random.uniform(1.5, 3.5),
            estimated_completion=datetime.now() + timedelta(days=random.randint(30, 90))
        )

    async def send_activity_update(self, activity: ActivityFeed):
        """Send team activity update to project subscribers."""
        update = LiveUpdate(
            id=f"activity_{datetime.now().timestamp()}",
            type=UpdateType.TEAM_ACTIVITY,
            project_id=activity.project_id,
            title="Team Activity",
            data=activity.dict(),
            user_id=activity.user_id
        )

        await manager.send_project_message(
            activity.project_id,
            {
                "type": "activity_feed",
                "activity": activity.dict()
            }
        )

    async def send_milestone_update(
        self,
        project_id: str,
        milestone_id: str,
        milestone_name: str,
        status: str,
        completion_date: Optional[datetime] = None
    ):
        """Send milestone status update."""
        update = LiveUpdate(
            id=f"milestone_{datetime.now().timestamp()}",
            type=UpdateType.MILESTONE_STATUS,
            project_id=project_id,
            title=f"Milestone {status}: {milestone_name}",
            data={
                "milestone_id": milestone_id,
                "milestone_name": milestone_name,
                "status": status,
                "completion_date": completion_date.isoformat() if completion_date else None
            }
        )

        # Send as notification if milestone completed
        if status == "completed":
            notification = Notification(
                id=f"notif_{datetime.now().timestamp()}",
                type=NotificationType.MILESTONE_COMPLETED,
                priority=NotificationPriority.HIGH,
                title=f"Milestone Completed: {milestone_name}",
                message=f"The milestone '{milestone_name}' has been completed",
                project_id=project_id,
                data=update.data,
                action_url=f"/projects/{project_id}/milestones/{milestone_id}"
            )
            await manager.send_notification(notification)
        else:
            await manager.send_project_message(
                project_id,
                {
                    "type": "milestone_update",
                    "update": update.dict()
                }
            )

    async def send_task_progress(
        self,
        project_id: str,
        task_id: str,
        task_name: str,
        progress: float,
        assignee: Optional[str] = None
    ):
        """Send task progress update."""
        update = LiveUpdate(
            id=f"task_{datetime.now().timestamp()}",
            type=UpdateType.TASK_PROGRESS,
            project_id=project_id,
            title=f"Task Progress: {task_name}",
            data={
                "task_id": task_id,
                "task_name": task_name,
                "progress": progress,
                "assignee": assignee
            }
        )

        await manager.send_project_message(
            project_id,
            {
                "type": "task_progress",
                "update": update.dict()
            }
        )

    async def send_budget_alert(
        self,
        project_id: str,
        current_budget: float,
        budget_limit: float,
        percentage_used: float
    ):
        """Send budget alert when thresholds are exceeded."""
        severity = NotificationPriority.NORMAL

        if percentage_used >= 90:
            severity = NotificationPriority.URGENT
            message = f"Budget critical: {percentage_used:.1f}% used"
        elif percentage_used >= 75:
            severity = NotificationPriority.HIGH
            message = f"Budget warning: {percentage_used:.1f}% used"
        else:
            message = f"Budget update: {percentage_used:.1f}% used"

        update = LiveUpdate(
            id=f"budget_{datetime.now().timestamp()}",
            type=UpdateType.BUDGET_UPDATE,
            project_id=project_id,
            title="Budget Alert",
            data={
                "current_budget": current_budget,
                "budget_limit": budget_limit,
                "percentage_used": percentage_used
            }
        )

        notification = Notification(
            id=f"notif_{datetime.now().timestamp()}",
            type=NotificationType.SYSTEM_ALERT,
            priority=severity,
            title="Budget Alert",
            message=message,
            project_id=project_id,
            data=update.data,
            action_url=f"/projects/{project_id}/budget"
        )

        await manager.send_notification(notification)

    async def send_timeline_update(
        self,
        project_id: str,
        old_end_date: datetime,
        new_end_date: datetime,
        reason: str
    ):
        """Send timeline change notification."""
        days_difference = (new_end_date - old_end_date).days

        if days_difference > 0:
            title = f"Timeline Extended by {days_difference} days"
            priority = NotificationPriority.HIGH
        else:
            title = f"Timeline Accelerated by {abs(days_difference)} days"
            priority = NotificationPriority.NORMAL

        update = LiveUpdate(
            id=f"timeline_{datetime.now().timestamp()}",
            type=UpdateType.TIMELINE_CHANGE,
            project_id=project_id,
            title=title,
            data={
                "old_end_date": old_end_date.isoformat(),
                "new_end_date": new_end_date.isoformat(),
                "days_difference": days_difference,
                "reason": reason
            }
        )

        notification = Notification(
            id=f"notif_{datetime.now().timestamp()}",
            type=NotificationType.PROJECT_UPDATE,
            priority=priority,
            title=title,
            message=f"Project timeline has been updated. Reason: {reason}",
            project_id=project_id,
            data=update.data,
            action_url=f"/projects/{project_id}/timeline"
        )

        await manager.send_notification(notification)

    def get_stream_status(self) -> Dict[str, Any]:
        """Get status of all active streams."""
        return {
            "active_streams": list(self.active_streams.keys()),
            "stream_count": len(self.active_streams),
            "stream_intervals": self.stream_intervals
        }


# Global update stream instance
update_stream = ProjectUpdateStream()


# Helper functions for common updates
async def log_user_activity(
    project_id: str,
    user_id: str,
    user_name: str,
    action: str,
    target_type: str,
    target_id: str,
    target_name: str,
    details: Dict[str, Any] = None
):
    """Log and broadcast user activity."""
    activity = ActivityFeed(
        project_id=project_id,
        user_id=user_id,
        user_name=user_name,
        action=action,
        target_type=target_type,
        target_id=target_id,
        target_name=target_name,
        timestamp=datetime.now(),
        details=details or {}
    )

    await update_stream.send_activity_update(activity)


async def update_task_progress(
    project_id: str,
    task_id: str,
    task_name: str,
    new_progress: float,
    user_id: str,
    user_name: str
):
    """Update and broadcast task progress."""
    # Send progress update
    await update_stream.send_task_progress(
        project_id=project_id,
        task_id=task_id,
        task_name=task_name,
        progress=new_progress,
        assignee=user_id
    )

    # Log activity
    await log_user_activity(
        project_id=project_id,
        user_id=user_id,
        user_name=user_name,
        action="updated progress",
        target_type="task",
        target_id=task_id,
        target_name=task_name,
        details={"progress": new_progress}
    )


async def complete_milestone(
    project_id: str,
    milestone_id: str,
    milestone_name: str,
    completed_by: str,
    completed_by_name: str
):
    """Mark milestone as completed and notify."""
    # Send milestone update
    await update_stream.send_milestone_update(
        project_id=project_id,
        milestone_id=milestone_id,
        milestone_name=milestone_name,
        status="completed",
        completion_date=datetime.now()
    )

    # Log activity
    await log_user_activity(
        project_id=project_id,
        user_id=completed_by,
        user_name=completed_by_name,
        action="completed",
        target_type="milestone",
        target_id=milestone_id,
        target_name=milestone_name
    )