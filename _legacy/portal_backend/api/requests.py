"""Work request submission and management API."""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
import uuid

from .auth import get_current_user, UserInfo, Permission
from ..config import settings


router = APIRouter(prefix="/requests", tags=["work-requests"])


class RequestType(str, Enum):
    """Types of work requests."""
    FEATURE = "feature"
    BUG_FIX = "bug_fix"
    ENHANCEMENT = "enhancement"
    SUPPORT = "support"
    CONSULTATION = "consultation"
    DOCUMENTATION = "documentation"
    MAINTENANCE = "maintenance"


class RequestPriority(str, Enum):
    """Request priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"
    CRITICAL = "critical"


class RequestStatus(str, Enum):
    """Request status."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    IN_PROGRESS = "in_progress"
    TESTING = "testing"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


class WorkRequestCreate(BaseModel):
    """Create work request model."""
    project_id: str
    type: RequestType
    priority: RequestPriority
    title: str = Field(..., min_length=5, max_length=200)
    description: str = Field(..., min_length=20)
    business_justification: Optional[str] = None
    acceptance_criteria: List[str] = []
    estimated_hours: Optional[float] = None
    due_date: Optional[datetime] = None
    attachments: List[str] = []
    metadata: Dict[str, Any] = {}


class WorkRequestUpdate(BaseModel):
    """Update work request model."""
    type: Optional[RequestType] = None
    priority: Optional[RequestPriority] = None
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=20)
    business_justification: Optional[str] = None
    acceptance_criteria: Optional[List[str]] = None
    estimated_hours: Optional[float] = None
    due_date: Optional[datetime] = None
    attachments: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class WorkRequest(BaseModel):
    """Work request model."""
    id: str
    project_id: str
    organization_id: str
    type: RequestType
    priority: RequestPriority
    status: RequestStatus
    title: str
    description: str
    business_justification: Optional[str] = None
    acceptance_criteria: List[str] = []
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    due_date: Optional[datetime] = None
    submitted_by: str
    submitted_at: datetime
    assigned_to: Optional[str] = None
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    attachments: List[str] = []
    comments: List[Dict[str, Any]] = []
    metadata: Dict[str, Any] = {}
    created_at: datetime
    updated_at: datetime


class RequestComment(BaseModel):
    """Comment on a work request."""
    text: str = Field(..., min_length=1, max_length=2000)
    is_internal: bool = False  # Internal comments not visible to clients


class RequestStatusUpdate(BaseModel):
    """Status update for work request."""
    status: RequestStatus
    comment: Optional[str] = None
    metadata: Dict[str, Any] = {}


# Mock data store
WORK_REQUESTS: Dict[str, WorkRequest] = {}


@router.post("/", response_model=WorkRequest)
async def create_work_request(
    request: WorkRequestCreate,
    current_user: UserInfo = Depends(get_current_user)
):
    """Create a new work request."""
    # Verify user has permission to create requests
    if Permission.CREATE_REQUEST not in current_user.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to create work requests"
        )

    # Create work request
    request_id = f"req_{uuid.uuid4().hex[:8]}"
    work_request = WorkRequest(
        id=request_id,
        project_id=request.project_id,
        organization_id=current_user.organization_id or "default",
        type=request.type,
        priority=request.priority,
        status=RequestStatus.SUBMITTED,
        title=request.title,
        description=request.description,
        business_justification=request.business_justification,
        acceptance_criteria=request.acceptance_criteria,
        estimated_hours=request.estimated_hours,
        due_date=request.due_date,
        submitted_by=current_user.user_id,
        submitted_at=datetime.now(),
        attachments=request.attachments,
        metadata=request.metadata,
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

    # Store in mock database
    WORK_REQUESTS[request_id] = work_request

    # In production, this would:
    # 1. Store in Convex
    # 2. Send notifications
    # 3. Create audit log

    return work_request


@router.get("/", response_model=List[WorkRequest])
async def list_work_requests(
    current_user: UserInfo = Depends(get_current_user),
    project_id: Optional[str] = None,
    status: Optional[RequestStatus] = None,
    priority: Optional[RequestPriority] = None,
    type: Optional[RequestType] = None,
    limit: int = 20,
    offset: int = 0
):
    """List work requests accessible to the current user."""
    requests = []

    # Filter based on user permissions
    for request in WORK_REQUESTS.values():
        # Check access
        if Permission.VIEW_ALL_PROJECTS not in current_user.permissions:
            if request.organization_id != current_user.organization_id:
                continue

        # Apply filters
        if project_id and request.project_id != project_id:
            continue
        if status and request.status != status:
            continue
        if priority and request.priority != priority:
            continue
        if type and request.type != type:
            continue

        requests.append(request)

    # Sort by submission date (newest first)
    requests.sort(key=lambda x: x.submitted_at, reverse=True)

    return requests[offset:offset + limit]


@router.get("/{request_id}", response_model=WorkRequest)
async def get_work_request(
    request_id: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """Get detailed work request information."""
    if request_id not in WORK_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work request not found"
        )

    request = WORK_REQUESTS[request_id]

    # Check access
    if Permission.VIEW_ALL_PROJECTS not in current_user.permissions:
        if request.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this work request"
            )

    return request


@router.put("/{request_id}", response_model=WorkRequest)
async def update_work_request(
    request_id: str,
    update: WorkRequestUpdate,
    current_user: UserInfo = Depends(get_current_user)
):
    """Update a work request (only by submitter or admin)."""
    request = await get_work_request(request_id, current_user)

    # Check permission to update
    is_submitter = request.submitted_by == current_user.user_id
    is_admin = Permission.ADMIN_ACCESS in current_user.permissions

    if not (is_submitter or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own requests"
        )

    # Only allow certain updates if request is already approved
    if request.status in [RequestStatus.APPROVED, RequestStatus.IN_PROGRESS]:
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot modify approved or in-progress requests"
            )

    # Update fields
    update_data = update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(request, field, value)

    request.updated_at = datetime.now()

    # Store updated request
    WORK_REQUESTS[request_id] = request

    return request


@router.post("/{request_id}/status", response_model=WorkRequest)
async def update_request_status(
    request_id: str,
    status_update: RequestStatusUpdate,
    current_user: UserInfo = Depends(get_current_user)
):
    """Update the status of a work request (admin only for certain transitions)."""
    request = await get_work_request(request_id, current_user)

    # Define allowed status transitions
    client_transitions = {
        RequestStatus.SUBMITTED: [RequestStatus.CANCELLED],
        RequestStatus.DRAFT: [RequestStatus.SUBMITTED, RequestStatus.CANCELLED],
    }

    admin_transitions = {
        RequestStatus.SUBMITTED: [RequestStatus.UNDER_REVIEW, RequestStatus.REJECTED],
        RequestStatus.UNDER_REVIEW: [RequestStatus.APPROVED, RequestStatus.REJECTED],
        RequestStatus.APPROVED: [RequestStatus.IN_PROGRESS],
        RequestStatus.IN_PROGRESS: [RequestStatus.TESTING],
        RequestStatus.TESTING: [RequestStatus.COMPLETED, RequestStatus.IN_PROGRESS],
    }

    # Check permissions for status transition
    is_admin = Permission.ADMIN_ACCESS in current_user.permissions
    is_submitter = request.submitted_by == current_user.user_id

    allowed_transitions = []
    if is_admin:
        allowed_transitions = admin_transitions.get(request.status, [])
    elif is_submitter:
        allowed_transitions = client_transitions.get(request.status, [])

    if status_update.status not in allowed_transitions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot transition from {request.status} to {status_update.status}"
        )

    # Update status
    request.status = status_update.status
    request.updated_at = datetime.now()

    # Set additional fields based on status
    if status_update.status == RequestStatus.APPROVED:
        request.approved_by = current_user.user_id
        request.approved_at = datetime.now()
    elif status_update.status == RequestStatus.COMPLETED:
        request.completed_at = datetime.now()

    # Add comment if provided
    if status_update.comment:
        comment = {
            "id": f"comment_{uuid.uuid4().hex[:8]}",
            "user_id": current_user.user_id,
            "text": status_update.comment,
            "is_status_change": True,
            "old_status": request.status.value,
            "new_status": status_update.status.value,
            "created_at": datetime.now().isoformat()
        }
        request.comments.append(comment)

    # Store updated request
    WORK_REQUESTS[request_id] = request

    return request


@router.post("/{request_id}/comments", response_model=Dict[str, Any])
async def add_comment(
    request_id: str,
    comment: RequestComment,
    current_user: UserInfo = Depends(get_current_user)
):
    """Add a comment to a work request."""
    request = await get_work_request(request_id, current_user)

    # Only admins can add internal comments
    if comment.is_internal and Permission.ADMIN_ACCESS not in current_user.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can add internal comments"
        )

    # Create comment
    new_comment = {
        "id": f"comment_{uuid.uuid4().hex[:8]}",
        "user_id": current_user.user_id,
        "text": comment.text,
        "is_internal": comment.is_internal,
        "created_at": datetime.now().isoformat()
    }

    request.comments.append(new_comment)
    request.updated_at = datetime.now()

    # Store updated request
    WORK_REQUESTS[request_id] = request

    return new_comment


@router.get("/{request_id}/comments", response_model=List[Dict[str, Any]])
async def get_comments(
    request_id: str,
    current_user: UserInfo = Depends(get_current_user),
    include_internal: bool = False
):
    """Get comments for a work request."""
    request = await get_work_request(request_id, current_user)

    comments = request.comments

    # Filter internal comments unless user is admin
    if not include_internal or Permission.ADMIN_ACCESS not in current_user.permissions:
        comments = [c for c in comments if not c.get("is_internal", False)]

    return comments


@router.post("/{request_id}/attachments")
async def upload_attachment(
    request_id: str,
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(get_current_user)
):
    """Upload an attachment to a work request."""
    request = await get_work_request(request_id, current_user)

    # Check if user can upload attachments
    is_submitter = request.submitted_by == current_user.user_id
    is_admin = Permission.ADMIN_ACCESS in current_user.permissions

    if not (is_submitter or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only add attachments to your own requests"
        )

    # In production, this would upload to S3 or similar
    attachment_id = f"attach_{uuid.uuid4().hex[:8]}"
    attachment_url = f"/api/attachments/{attachment_id}"

    request.attachments.append(attachment_url)
    request.updated_at = datetime.now()

    # Store updated request
    WORK_REQUESTS[request_id] = request

    return {
        "attachment_id": attachment_id,
        "url": attachment_url,
        "filename": file.filename,
        "content_type": file.content_type,
        "size": 0  # Would get actual size in production
    }


@router.delete("/{request_id}")
async def delete_work_request(
    request_id: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """Delete a work request (only draft or cancelled requests)."""
    request = await get_work_request(request_id, current_user)

    # Check permission
    is_submitter = request.submitted_by == current_user.user_id
    is_admin = Permission.ADMIN_ACCESS in current_user.permissions

    if not (is_submitter or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own requests"
        )

    # Only allow deletion of draft or cancelled requests
    if request.status not in [RequestStatus.DRAFT, RequestStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Can only delete draft or cancelled requests"
        )

    del WORK_REQUESTS[request_id]

    return {"message": "Work request deleted successfully"}