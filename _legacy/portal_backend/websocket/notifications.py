"""Real-time notification system using WebSockets."""
import asyncio
import json
from typing import Dict, Set, Optional, Any, List
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect, Depends, Query
from pydantic import BaseModel
from enum import Enum
import jwt
import logging

from ..config import settings
from ..api.auth import UserInfo


logger = logging.getLogger(__name__)


class NotificationType(str, Enum):
    """Types of notifications."""
    PROJECT_UPDATE = "project_update"
    REQUEST_STATUS = "request_status"
    DOCUMENT_SHARED = "document_shared"
    MILESTONE_COMPLETED = "milestone_completed"
    COMMENT_ADDED = "comment_added"
    TASK_ASSIGNED = "task_assigned"
    DEADLINE_REMINDER = "deadline_reminder"
    SYSTEM_ALERT = "system_alert"


class NotificationPriority(str, Enum):
    """Notification priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Notification(BaseModel):
    """Notification model."""
    id: str
    type: NotificationType
    priority: NotificationPriority = NotificationPriority.NORMAL
    title: str
    message: str
    data: Dict[str, Any] = {}
    user_id: Optional[str] = None  # None for broadcast
    organization_id: Optional[str] = None
    project_id: Optional[str] = None
    action_url: Optional[str] = None
    read: bool = False
    created_at: datetime = datetime.now()


class ConnectionManager:
    """Manages WebSocket connections for real-time notifications."""

    def __init__(self):
        # Active connections: user_id -> set of WebSocket connections
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Organization subscriptions: org_id -> set of user_ids
        self.organization_subscribers: Dict[str, Set[str]] = {}
        # Project subscriptions: project_id -> set of user_ids
        self.project_subscribers: Dict[str, Set[str]] = {}
        # Notification queue
        self.notification_queue: asyncio.Queue = asyncio.Queue()
        # Background task for processing notifications
        self.processing_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket, user_id: str, organization_id: Optional[str] = None):
        """Accept and register a new WebSocket connection."""
        await websocket.accept()

        # Add to active connections
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

        # Subscribe to organization notifications
        if organization_id:
            if organization_id not in self.organization_subscribers:
                self.organization_subscribers[organization_id] = set()
            self.organization_subscribers[organization_id].add(user_id)

        # Send welcome message
        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "message": "Connected to notification service",
            "timestamp": datetime.now().isoformat()
        })

        logger.info(f"User {user_id} connected via WebSocket")

    async def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection."""
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

        logger.info(f"User {user_id} disconnected from WebSocket")

    async def subscribe_to_project(self, user_id: str, project_id: str):
        """Subscribe user to project notifications."""
        if project_id not in self.project_subscribers:
            self.project_subscribers[project_id] = set()
        self.project_subscribers[project_id].add(user_id)

        # Send confirmation
        await self.send_personal_message(
            user_id,
            {
                "type": "subscription",
                "action": "subscribed",
                "project_id": project_id,
                "message": f"Subscribed to project {project_id} notifications"
            }
        )

    async def unsubscribe_from_project(self, user_id: str, project_id: str):
        """Unsubscribe user from project notifications."""
        if project_id in self.project_subscribers:
            self.project_subscribers[project_id].discard(user_id)

        # Send confirmation
        await self.send_personal_message(
            user_id,
            {
                "type": "subscription",
                "action": "unsubscribed",
                "project_id": project_id,
                "message": f"Unsubscribed from project {project_id} notifications"
            }
        )

    async def send_personal_message(self, user_id: str, message: Dict[str, Any]):
        """Send message to a specific user."""
        if user_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error sending message to {user_id}: {e}")
                    disconnected.add(connection)

            # Remove disconnected connections
            for conn in disconnected:
                self.active_connections[user_id].discard(conn)

    async def send_organization_message(self, organization_id: str, message: Dict[str, Any]):
        """Send message to all users in an organization."""
        if organization_id in self.organization_subscribers:
            for user_id in self.organization_subscribers[organization_id]:
                await self.send_personal_message(user_id, message)

    async def send_project_message(self, project_id: str, message: Dict[str, Any]):
        """Send message to all users subscribed to a project."""
        if project_id in self.project_subscribers:
            for user_id in self.project_subscribers[project_id]:
                await self.send_personal_message(user_id, message)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast message to all connected users."""
        for user_id in list(self.active_connections.keys()):
            await self.send_personal_message(user_id, message)

    async def send_notification(self, notification: Notification):
        """Queue a notification for delivery."""
        await self.notification_queue.put(notification)

    async def process_notifications(self):
        """Background task to process notification queue."""
        while True:
            try:
                notification = await self.notification_queue.get()

                # Convert notification to message
                message = {
                    "type": "notification",
                    "notification": notification.dict()
                }

                # Route notification based on scope
                if notification.user_id:
                    # Personal notification
                    await self.send_personal_message(notification.user_id, message)
                elif notification.project_id:
                    # Project notification
                    await self.send_project_message(notification.project_id, message)
                elif notification.organization_id:
                    # Organization notification
                    await self.send_organization_message(notification.organization_id, message)
                else:
                    # Broadcast
                    await self.broadcast(message)

            except Exception as e:
                logger.error(f"Error processing notification: {e}")

    def start_processing(self):
        """Start the notification processing task."""
        if not self.processing_task:
            self.processing_task = asyncio.create_task(self.process_notifications())

    def stop_processing(self):
        """Stop the notification processing task."""
        if self.processing_task:
            self.processing_task.cancel()
            self.processing_task = None

    def get_connection_stats(self) -> Dict[str, Any]:
        """Get statistics about active connections."""
        total_users = len(self.active_connections)
        total_connections = sum(len(conns) for conns in self.active_connections.values())

        return {
            "total_users": total_users,
            "total_connections": total_connections,
            "organization_subscribers": {
                org_id: len(users)
                for org_id, users in self.organization_subscribers.items()
            },
            "project_subscribers": {
                proj_id: len(users)
                for proj_id, users in self.project_subscribers.items()
            }
        }


# Global connection manager instance
manager = ConnectionManager()


async def get_user_from_token(token: str) -> Optional[UserInfo]:
    """Extract user info from JWT token."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm]
        )

        return UserInfo(
            user_id=payload["sub"],
            email=payload.get("email", ""),
            organization_id=payload.get("organization_id"),
            role=payload.get("role", "client"),
            permissions=payload.get("permissions", [])
        )
    except jwt.JWTError:
        return None


async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...)
):
    """WebSocket endpoint for real-time notifications."""
    # Authenticate user
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=1008, reason="Invalid authentication")
        return

    # Connect user
    await manager.connect(websocket, user.user_id, user.organization_id)

    try:
        while True:
            # Receive messages from client
            data = await websocket.receive_json()

            # Handle different message types
            if data.get("type") == "ping":
                # Heartbeat
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.now().isoformat()
                })

            elif data.get("type") == "subscribe":
                # Subscribe to project
                project_id = data.get("project_id")
                if project_id:
                    await manager.subscribe_to_project(user.user_id, project_id)

            elif data.get("type") == "unsubscribe":
                # Unsubscribe from project
                project_id = data.get("project_id")
                if project_id:
                    await manager.unsubscribe_from_project(user.user_id, project_id)

    except WebSocketDisconnect:
        await manager.disconnect(websocket, user.user_id)
    except Exception as e:
        logger.error(f"WebSocket error for user {user.user_id}: {e}")
        await manager.disconnect(websocket, user.user_id)


# Helper functions for sending notifications
async def send_project_update(
    project_id: str,
    title: str,
    message: str,
    data: Dict[str, Any] = None
):
    """Send a project update notification."""
    notification = Notification(
        id=f"notif_{datetime.now().timestamp()}",
        type=NotificationType.PROJECT_UPDATE,
        title=title,
        message=message,
        project_id=project_id,
        data=data or {},
        action_url=f"/projects/{project_id}"
    )
    await manager.send_notification(notification)


async def send_request_status_update(
    user_id: str,
    request_id: str,
    old_status: str,
    new_status: str,
    message: str
):
    """Send a work request status update notification."""
    notification = Notification(
        id=f"notif_{datetime.now().timestamp()}",
        type=NotificationType.REQUEST_STATUS,
        priority=NotificationPriority.HIGH,
        title=f"Request Status Changed: {new_status}",
        message=message,
        user_id=user_id,
        data={
            "request_id": request_id,
            "old_status": old_status,
            "new_status": new_status
        },
        action_url=f"/requests/{request_id}"
    )
    await manager.send_notification(notification)


async def send_document_shared_notification(
    user_ids: List[str],
    document_id: str,
    document_name: str,
    shared_by: str
):
    """Send notification when a document is shared."""
    for user_id in user_ids:
        notification = Notification(
            id=f"notif_{datetime.now().timestamp()}",
            type=NotificationType.DOCUMENT_SHARED,
            title="Document Shared With You",
            message=f"{shared_by} shared '{document_name}' with you",
            user_id=user_id,
            data={
                "document_id": document_id,
                "document_name": document_name,
                "shared_by": shared_by
            },
            action_url=f"/documents/{document_id}"
        )
        await manager.send_notification(notification)