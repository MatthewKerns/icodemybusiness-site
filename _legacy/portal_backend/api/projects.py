"""Client project view and management API."""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date
from enum import Enum
import httpx

from .auth import get_current_user, UserInfo, check_permission, Permission
from ..config import settings


router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectStatus(str, Enum):
    """Project status enumeration."""
    PLANNING = "planning"
    IN_PROGRESS = "in_progress"
    REVIEW = "review"
    COMPLETED = "completed"
    ON_HOLD = "on_hold"
    CANCELLED = "cancelled"


class ProjectHealth(str, Enum):
    """Project health indicator."""
    EXCELLENT = "excellent"
    GOOD = "good"
    WARNING = "warning"
    AT_RISK = "at_risk"
    CRITICAL = "critical"


class Milestone(BaseModel):
    """Project milestone."""
    id: str
    name: str
    description: str
    due_date: date
    completed: bool = False
    completed_date: Optional[date] = None


class ProjectMetrics(BaseModel):
    """Project health metrics."""
    health: ProjectHealth
    completion_percentage: float = Field(ge=0, le=100)
    days_remaining: int
    budget_used_percentage: float = Field(ge=0, le=100)
    active_tasks: int
    completed_tasks: int
    open_issues: int
    last_activity: datetime


class Project(BaseModel):
    """Project model for client view."""
    id: str
    name: str
    description: str
    organization_id: str
    status: ProjectStatus
    start_date: date
    end_date: date
    budget: Optional[float] = None
    metrics: ProjectMetrics
    milestones: List[Milestone] = []
    team_members: List[str] = []
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime


class ProjectUpdate(BaseModel):
    """Project update notification."""
    project_id: str
    update_type: str
    title: str
    description: str
    user: str
    timestamp: datetime
    metadata: Dict[str, Any] = {}


class ProjectDocument(BaseModel):
    """Project document reference."""
    id: str
    project_id: str
    name: str
    type: str
    size: int
    url: str
    uploaded_by: str
    uploaded_at: datetime
    tags: List[str] = []


# Mock data store (replace with Convex integration)
MOCK_PROJECTS = {}


async def get_convex_client():
    """Get Convex client for real-time data."""
    # This would be replaced with actual Convex client initialization
    return None


async def fetch_user_projects(user_id: str, organization_id: Optional[str] = None) -> List[Project]:
    """Fetch projects for a specific user/organization from Convex."""
    # Mock implementation - replace with actual Convex query
    projects = []

    # Generate mock projects for testing
    if organization_id:
        for i in range(1, 4):
            project = Project(
                id=f"proj_{organization_id}_{i}",
                name=f"Project {i}",
                description=f"Client project {i} for organization {organization_id}",
                organization_id=organization_id,
                status=ProjectStatus.IN_PROGRESS,
                start_date=date(2024, 1, 1),
                end_date=date(2024, 12, 31),
                budget=50000.0,
                metrics=ProjectMetrics(
                    health=ProjectHealth.GOOD,
                    completion_percentage=45.0,
                    days_remaining=290,
                    budget_used_percentage=42.0,
                    active_tasks=12,
                    completed_tasks=8,
                    open_issues=2,
                    last_activity=datetime.now()
                ),
                milestones=[
                    Milestone(
                        id=f"milestone_{i}_1",
                        name="Phase 1",
                        description="Initial planning and setup",
                        due_date=date(2024, 3, 31),
                        completed=True,
                        completed_date=date(2024, 3, 28)
                    ),
                    Milestone(
                        id=f"milestone_{i}_2",
                        name="Phase 2",
                        description="Development and implementation",
                        due_date=date(2024, 6, 30),
                        completed=False
                    )
                ],
                team_members=["dev1", "dev2", "designer1"],
                tags=["web", "mobile", "api"],
                created_at=datetime(2024, 1, 1),
                updated_at=datetime.now()
            )
            projects.append(project)

    return projects


@router.get("/", response_model=List[Project])
async def list_projects(
    current_user: UserInfo = Depends(get_current_user),
    status: Optional[ProjectStatus] = None,
    health: Optional[ProjectHealth] = None,
    tags: Optional[List[str]] = Query(None)
):
    """List all projects accessible to the current user."""
    # Check permission
    if Permission.VIEW_ALL_PROJECTS in current_user.permissions:
        # Admin can see all projects
        projects = await fetch_user_projects(current_user.user_id, None)
    else:
        # Clients can only see their organization's projects
        if not current_user.organization_id:
            return []
        projects = await fetch_user_projects(
            current_user.user_id,
            current_user.organization_id
        )

    # Apply filters
    if status:
        projects = [p for p in projects if p.status == status]

    if health:
        projects = [p for p in projects if p.metrics.health == health]

    if tags:
        projects = [
            p for p in projects
            if any(tag in p.tags for tag in tags)
        ]

    return projects


@router.get("/{project_id}", response_model=Project)
async def get_project(
    project_id: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """Get detailed project information."""
    # Fetch all user's projects
    projects = await fetch_user_projects(
        current_user.user_id,
        current_user.organization_id
    )

    # Find the specific project
    project = next((p for p in projects if p.id == project_id), None)

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )

    # Verify access
    if Permission.VIEW_ALL_PROJECTS not in current_user.permissions:
        if project.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )

    return project


@router.get("/{project_id}/updates", response_model=List[ProjectUpdate])
async def get_project_updates(
    project_id: str,
    current_user: UserInfo = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0)
):
    """Get recent updates for a project."""
    # Verify project access first
    project = await get_project(project_id, current_user)

    # Mock updates - replace with Convex query
    updates = []
    for i in range(5):
        update = ProjectUpdate(
            project_id=project_id,
            update_type="milestone_completed" if i % 2 == 0 else "task_updated",
            title=f"Update {i + 1}",
            description=f"Project update description for {project.name}",
            user="team_member",
            timestamp=datetime.now(),
            metadata={"priority": "high" if i == 0 else "normal"}
        )
        updates.append(update)

    return updates[offset:offset + limit]


@router.get("/{project_id}/documents", response_model=List[ProjectDocument])
async def get_project_documents(
    project_id: str,
    current_user: UserInfo = Depends(get_current_user),
    document_type: Optional[str] = None
):
    """Get documents associated with a project."""
    # Verify project access first
    project = await get_project(project_id, current_user)

    # Mock documents - replace with Convex query
    documents = [
        ProjectDocument(
            id="doc_1",
            project_id=project_id,
            name="Project Proposal.pdf",
            type="pdf",
            size=2048000,
            url=f"/api/documents/doc_1/download",
            uploaded_by="admin",
            uploaded_at=datetime.now(),
            tags=["proposal", "initial"]
        ),
        ProjectDocument(
            id="doc_2",
            project_id=project_id,
            name="Technical Specifications.docx",
            type="docx",
            size=1024000,
            url=f"/api/documents/doc_2/download",
            uploaded_by="dev_lead",
            uploaded_at=datetime.now(),
            tags=["technical", "specs"]
        )
    ]

    if document_type:
        documents = [d for d in documents if d.type == document_type]

    return documents


@router.get("/{project_id}/metrics", response_model=ProjectMetrics)
async def get_project_metrics(
    project_id: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """Get current project health metrics."""
    # Verify project access first
    project = await get_project(project_id, current_user)

    return project.metrics


@router.get("/{project_id}/milestones", response_model=List[Milestone])
async def get_project_milestones(
    project_id: str,
    current_user: UserInfo = Depends(get_current_user),
    include_completed: bool = True
):
    """Get project milestones."""
    # Verify project access first
    project = await get_project(project_id, current_user)

    milestones = project.milestones

    if not include_completed:
        milestones = [m for m in milestones if not m.completed]

    return milestones


@router.post("/{project_id}/subscribe")
async def subscribe_to_project(
    project_id: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """Subscribe to real-time updates for a project."""
    # Verify project access first
    await get_project(project_id, current_user)

    # Register subscription in Redis or Convex
    # This would typically store the user-project subscription mapping

    return {
        "message": "Successfully subscribed to project updates",
        "project_id": project_id,
        "user_id": current_user.user_id
    }


@router.delete("/{project_id}/unsubscribe")
async def unsubscribe_from_project(
    project_id: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """Unsubscribe from project updates."""
    # Verify project access first
    await get_project(project_id, current_user)

    # Remove subscription from Redis or Convex

    return {
        "message": "Successfully unsubscribed from project updates",
        "project_id": project_id,
        "user_id": current_user.user_id
    }