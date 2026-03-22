"""
Communications and messaging endpoints for Agent-OS compatibility.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import logging

from services.convex_client import get_convex_client, get_mock_convex_client
import os

logger = logging.getLogger(__name__)

router = APIRouter()


def transform_message_data(
    convex_message: Dict[str, Any],
    client_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Transform Convex message data to Agent-OS format.

    Args:
        convex_message: Message data from Convex
        client_name: Name of associated client

    Returns:
        Transformed message data for Agent-OS
    """
    # Generate suggested reply based on message content
    suggested_reply = generate_suggested_reply(convex_message)

    return {
        "id": convex_message.get("_id"),
        "channel": convex_message.get("channel", "email"),
        "from": convex_message.get("from", {}).get("name", "Unknown"),
        "fromEmail": convex_message.get("from", {}).get("email"),
        "subject": convex_message.get("subject", "No subject"),
        "body": convex_message.get("body", ""),
        "receivedAt": datetime.fromtimestamp(
            convex_message.get("createdAt", 0) / 1000
        ).isoformat() if convex_message.get("createdAt") else datetime.now().isoformat(),
        "isRead": convex_message.get("isRead", False),
        "requiresResponse": convex_message.get("direction") == "inbound" and not convex_message.get("isReplied", False),
        "clientId": convex_message.get("clientId"),
        "clientName": client_name,
        "projectId": convex_message.get("projectId"),
        "suggestedReply": suggested_reply,
        "sentiment": analyze_sentiment(convex_message.get("body", "")),
        "priority": determine_priority(convex_message),
        "threadId": convex_message.get("threadId"),
        "attachments": convex_message.get("attachments", [])
    }


def generate_suggested_reply(message: Dict[str, Any]) -> str:
    """
    Generate AI-suggested reply for a message.

    Args:
        message: Message data

    Returns:
        Suggested reply text
    """
    # In production, this would use AI to generate contextual replies
    # For now, return template responses based on common patterns

    body = message.get("body", "").lower()
    from_name = message.get("from", {}).get("name", "there")

    if "schedule" in body or "meeting" in body or "call" in body:
        return f"Hi {from_name}, I'd be happy to schedule a meeting. I have availability this week on Tuesday at 2 PM or Thursday at 10 AM. Would either of these times work for you?"

    elif "progress" in body or "update" in body or "status" in body:
        return f"Hi {from_name}, Thanks for checking in. The project is progressing well. I'll send you a detailed status update by end of day. Please let me know if you need any specific information."

    elif "quote" in body or "pricing" in body or "cost" in body:
        return f"Hi {from_name}, Thank you for your interest. I'll prepare a detailed quote based on your requirements and send it over within 24 hours. Could you share any specific features or requirements you have in mind?"

    elif "thank" in body or "great work" in body or "excellent" in body:
        return f"Hi {from_name}, Thank you for the kind words! It's been a pleasure working on this project. Please don't hesitate to reach out if you need anything else."

    else:
        return f"Hi {from_name}, Thank you for your message. I'll review this and get back to you shortly with a detailed response."


def analyze_sentiment(text: str) -> str:
    """
    Analyze sentiment of message text.

    Args:
        text: Message body

    Returns:
        Sentiment classification
    """
    # Simple keyword-based sentiment analysis
    # In production, use NLP library or API

    text_lower = text.lower()

    positive_keywords = ["great", "excellent", "thank", "happy", "pleased", "wonderful", "perfect", "love"]
    negative_keywords = ["problem", "issue", "concern", "unhappy", "disappointed", "frustrated", "angry", "wrong"]

    positive_count = sum(1 for word in positive_keywords if word in text_lower)
    negative_count = sum(1 for word in negative_keywords if word in text_lower)

    if positive_count > negative_count:
        return "positive"
    elif negative_count > positive_count:
        return "negative"
    else:
        return "neutral"


def determine_priority(message: Dict[str, Any]) -> str:
    """
    Determine message priority based on various factors.

    Args:
        message: Message data

    Returns:
        Priority level
    """
    # Factors for priority determination
    priority_score = 0

    # Client tier (if available)
    if message.get("clientTier") == "enterprise":
        priority_score += 3
    elif message.get("clientTier") == "growth":
        priority_score += 2

    # Keywords indicating urgency
    urgent_keywords = ["urgent", "asap", "immediately", "critical", "emergency"]
    body = message.get("body", "").lower()
    if any(keyword in body for keyword in urgent_keywords):
        priority_score += 3

    # Unread duration
    if message.get("createdAt"):
        hours_old = (datetime.now() - datetime.fromtimestamp(message["createdAt"] / 1000)).total_seconds() / 3600
        if hours_old > 24:
            priority_score += 2
        elif hours_old > 12:
            priority_score += 1

    # Determine final priority
    if priority_score >= 5:
        return "high"
    elif priority_score >= 2:
        return "medium"
    else:
        return "low"


@router.get("")
async def get_communications(
    channel: Optional[str] = Query(None, description="Filter by channel (email, linkedin, etc.)"),
    unread: Optional[bool] = Query(None, description="Filter unread messages"),
    clientId: Optional[str] = Query(None, description="Filter by client ID"),
    projectId: Optional[str] = Query(None, description="Filter by project ID"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page")
) -> Dict[str, Any]:
    """
    Get all communications with optional filtering.

    Returns:
        List of communications in Agent-OS format
    """
    try:
        # Use mock client in development if Convex not configured
        if os.getenv("CONVEX_URL"):
            client = get_convex_client()
        else:
            client = get_mock_convex_client()

        # Build query arguments
        query_args = {}
        if channel:
            query_args["channel"] = channel
        if unread is not None:
            query_args["isRead"] = not unread
        if clientId:
            query_args["clientId"] = clientId
        if projectId:
            query_args["projectId"] = projectId

        # Query Convex
        messages = await client.query("messages:list", query_args)

        # Get client names for messages
        client_ids = list(set(m.get("clientId") for m in messages if m.get("clientId")))
        clients = {}
        for cid in client_ids:
            client_data = await client.query("clients:get", {"id": cid})
            if client_data:
                clients[cid] = {
                    "name": client_data.get("companyName"),
                    "tier": client_data.get("tier")
                }

        # Transform to Agent-OS format
        transformed_messages = []
        for convex_message in messages:
            client_info = clients.get(convex_message.get("clientId"), {})
            convex_message["clientTier"] = client_info.get("tier")
            transformed_messages.append(
                transform_message_data(convex_message, client_info.get("name"))
            )

        # Sort by priority and date
        transformed_messages.sort(
            key=lambda x: (
                {"high": 0, "medium": 1, "low": 2}.get(x.get("priority", "low"), 2),
                x.get("receivedAt", "")
            ),
            reverse=True
        )

        # Calculate unread count
        unread_count = sum(1 for m in transformed_messages if not m.get("isRead"))

        # Apply pagination
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_messages = transformed_messages[start_idx:end_idx]

        return {
            "success": True,
            "data": paginated_messages,
            "total": len(transformed_messages),
            "unreadCount": unread_count,
            "page": page,
            "pages": (len(transformed_messages) + limit - 1) // limit
        }

    except Exception as e:
        logger.error(f"Error fetching communications: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{message_id}")
async def get_message(message_id: str) -> Dict[str, Any]:
    """
    Get a single message by ID.

    Args:
        message_id: Message identifier

    Returns:
        Detailed message information
    """
    try:
        # Use mock client in development if Convex not configured
        if os.getenv("CONVEX_URL"):
            client = get_convex_client()
        else:
            client = get_mock_convex_client()

        # Query Convex for specific message
        convex_message = await client.query("messages:get", {"id": message_id})

        if not convex_message:
            raise HTTPException(status_code=404, detail="Message not found")

        # Get client information if available
        client_name = None
        if convex_message.get("clientId"):
            client_data = await client.query("clients:get", {"id": convex_message["clientId"]})
            if client_data:
                client_name = client_data.get("companyName")
                convex_message["clientTier"] = client_data.get("tier")

        # Transform to detailed Agent-OS format
        transformed = transform_message_data(convex_message, client_name)

        # Get thread messages if this is part of a thread
        if convex_message.get("threadId"):
            thread_messages = await client.query("messages:list", {"threadId": convex_message["threadId"]})
            transformed["thread"] = [
                {
                    "id": m.get("_id"),
                    "from": m.get("from", {}).get("name"),
                    "subject": m.get("subject"),
                    "sentAt": datetime.fromtimestamp(m.get("createdAt", 0) / 1000).isoformat(),
                    "direction": m.get("direction")
                }
                for m in thread_messages if m.get("_id") != message_id
            ]

        return {
            "success": True,
            "data": transformed
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching message {message_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{message_id}/mark-read")
async def mark_message_read(message_id: str) -> Dict[str, Any]:
    """
    Mark a message as read.

    Args:
        message_id: Message identifier

    Returns:
        Update status
    """
    try:
        # Use mock client in development if Convex not configured
        if os.getenv("CONVEX_URL"):
            client = get_convex_client()
        else:
            client = get_mock_convex_client()

        # Update message status
        result = await client.mutate("messages:markRead", {"id": message_id})

        return {
            "success": True,
            "message": f"Message {message_id} marked as read"
        }

    except Exception as e:
        logger.error(f"Error marking message {message_id} as read: {e}")
        raise HTTPException(status_code=500, detail=str(e))