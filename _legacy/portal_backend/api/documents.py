"""Document access and management API."""
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, BinaryIO
from datetime import datetime
from enum import Enum
import uuid
import os
import mimetypes
from pathlib import Path

from .auth import get_current_user, UserInfo, Permission
from ..config import settings


router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentType(str, Enum):
    """Document type enumeration."""
    CONTRACT = "contract"
    PROPOSAL = "proposal"
    SPECIFICATION = "specification"
    REPORT = "report"
    INVOICE = "invoice"
    PRESENTATION = "presentation"
    SPREADSHEET = "spreadsheet"
    IMAGE = "image"
    VIDEO = "video"
    OTHER = "other"


class DocumentAccess(str, Enum):
    """Document access levels."""
    PUBLIC = "public"  # Anyone with link
    CLIENT = "client"  # All client users
    PROJECT = "project"  # Project team members
    RESTRICTED = "restricted"  # Specific users only


class Document(BaseModel):
    """Document model."""
    id: str
    name: str
    description: Optional[str] = None
    type: DocumentType
    mime_type: str
    size: int
    project_id: Optional[str] = None
    organization_id: str
    access_level: DocumentAccess = DocumentAccess.CLIENT
    allowed_users: List[str] = []  # For restricted access
    url: str
    download_url: str
    thumbnail_url: Optional[str] = None
    uploaded_by: str
    uploaded_at: datetime
    last_accessed: Optional[datetime] = None
    access_count: int = 0
    version: int = 1
    previous_versions: List[str] = []
    tags: List[str] = []
    metadata: Dict[str, Any] = {}
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class DocumentUpload(BaseModel):
    """Document upload request."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    type: DocumentType
    project_id: Optional[str] = None
    access_level: DocumentAccess = DocumentAccess.CLIENT
    allowed_users: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    expires_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class DocumentUpdate(BaseModel):
    """Document update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    access_level: Optional[DocumentAccess] = None
    allowed_users: Optional[List[str]] = None
    tags: Optional[List[str]] = None
    expires_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None


class DocumentShare(BaseModel):
    """Document sharing request."""
    user_ids: List[str]
    access_level: DocumentAccess = DocumentAccess.CLIENT
    expires_at: Optional[datetime] = None
    notify: bool = True
    message: Optional[str] = None


# Mock data store
DOCUMENTS: Dict[str, Document] = {}
DOCUMENT_STORAGE_PATH = Path("/tmp/portal_documents")  # In production, use S3 or similar
DOCUMENT_STORAGE_PATH.mkdir(exist_ok=True)


def get_document_type(mime_type: str) -> DocumentType:
    """Determine document type from MIME type."""
    type_mapping = {
        "application/pdf": DocumentType.CONTRACT,
        "application/msword": DocumentType.SPECIFICATION,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DocumentType.SPECIFICATION,
        "application/vnd.ms-excel": DocumentType.SPREADSHEET,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": DocumentType.SPREADSHEET,
        "application/vnd.ms-powerpoint": DocumentType.PRESENTATION,
        "application/vnd.openxmlformats-officedocument.presentationml.presentation": DocumentType.PRESENTATION,
        "image/": DocumentType.IMAGE,
        "video/": DocumentType.VIDEO,
    }

    for key, doc_type in type_mapping.items():
        if mime_type.startswith(key):
            return doc_type

    return DocumentType.OTHER


async def check_document_access(
    document: Document,
    user: UserInfo
) -> bool:
    """Check if user has access to document."""
    # Admins have access to all documents
    if Permission.ADMIN_ACCESS in user.permissions:
        return True

    # Check expiration
    if document.expires_at and document.expires_at < datetime.now():
        return False

    # Check access level
    if document.access_level == DocumentAccess.PUBLIC:
        return True

    if document.access_level == DocumentAccess.CLIENT:
        return document.organization_id == user.organization_id

    if document.access_level == DocumentAccess.PROJECT:
        # Would check if user is part of project team
        return document.organization_id == user.organization_id

    if document.access_level == DocumentAccess.RESTRICTED:
        return user.user_id in document.allowed_users

    return False


@router.post("/upload", response_model=Document)
async def upload_document(
    file: UploadFile = File(...),
    name: Optional[str] = None,
    description: Optional[str] = None,
    type: Optional[DocumentType] = None,
    project_id: Optional[str] = None,
    access_level: DocumentAccess = DocumentAccess.CLIENT,
    tags: Optional[str] = None,  # Comma-separated tags
    current_user: UserInfo = Depends(get_current_user)
):
    """Upload a new document."""
    # Check permission
    if Permission.VIEW_DOCUMENTS not in current_user.permissions:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to upload documents"
        )

    # Generate document ID
    doc_id = f"doc_{uuid.uuid4().hex[:8]}"

    # Determine MIME type
    mime_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"

    # Determine document type if not provided
    if not type:
        type = get_document_type(mime_type)

    # Save file (in production, upload to S3)
    file_path = DOCUMENT_STORAGE_PATH / f"{doc_id}_{file.filename}"
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Create document record
    document = Document(
        id=doc_id,
        name=name or file.filename,
        description=description,
        type=type,
        mime_type=mime_type,
        size=len(content),
        project_id=project_id,
        organization_id=current_user.organization_id or "default",
        access_level=access_level,
        url=f"/api/documents/{doc_id}",
        download_url=f"/api/documents/{doc_id}/download",
        uploaded_by=current_user.user_id,
        uploaded_at=datetime.now(),
        tags=tags.split(",") if tags else [],
        created_at=datetime.now(),
        updated_at=datetime.now()
    )

    # Store document
    DOCUMENTS[doc_id] = document

    return document


@router.get("/", response_model=List[Document])
async def list_documents(
    current_user: UserInfo = Depends(get_current_user),
    project_id: Optional[str] = None,
    type: Optional[DocumentType] = None,
    tags: Optional[str] = None,  # Comma-separated tags
    limit: int = 20,
    offset: int = 0
):
    """List all documents accessible to the current user."""
    accessible_docs = []

    for document in DOCUMENTS.values():
        # Check access
        if not await check_document_access(document, current_user):
            continue

        # Apply filters
        if project_id and document.project_id != project_id:
            continue
        if type and document.type != type:
            continue
        if tags:
            tag_list = tags.split(",")
            if not any(tag in document.tags for tag in tag_list):
                continue

        accessible_docs.append(document)

    # Sort by upload date (newest first)
    accessible_docs.sort(key=lambda x: x.uploaded_at, reverse=True)

    return accessible_docs[offset:offset + limit]


@router.get("/{document_id}", response_model=Document)
async def get_document(
    document_id: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """Get document metadata."""
    if document_id not in DOCUMENTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    document = DOCUMENTS[document_id]

    # Check access
    if not await check_document_access(document, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this document"
        )

    # Update access metrics
    document.last_accessed = datetime.now()
    document.access_count += 1

    return document


@router.get("/{document_id}/download")
async def download_document(
    document_id: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """Download document file."""
    document = await get_document(document_id, current_user)

    # Find file (in production, generate S3 presigned URL)
    file_path = None
    for file in DOCUMENT_STORAGE_PATH.glob(f"{document_id}_*"):
        file_path = file
        break

    if not file_path or not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document file not found"
        )

    return FileResponse(
        path=file_path,
        media_type=document.mime_type,
        filename=document.name
    )


@router.put("/{document_id}", response_model=Document)
async def update_document(
    document_id: str,
    update: DocumentUpdate,
    current_user: UserInfo = Depends(get_current_user)
):
    """Update document metadata."""
    document = await get_document(document_id, current_user)

    # Check permission (only uploader or admin can update)
    is_uploader = document.uploaded_by == current_user.user_id
    is_admin = Permission.ADMIN_ACCESS in current_user.permissions

    if not (is_uploader or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update documents you uploaded"
        )

    # Update fields
    update_data = update.dict(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(document, field, value)

    document.updated_at = datetime.now()

    # Store updated document
    DOCUMENTS[document_id] = document

    return document


@router.post("/{document_id}/share", response_model=Dict[str, Any])
async def share_document(
    document_id: str,
    share_request: DocumentShare,
    current_user: UserInfo = Depends(get_current_user)
):
    """Share document with specific users."""
    document = await get_document(document_id, current_user)

    # Check permission (only uploader or admin can share)
    is_uploader = document.uploaded_by == current_user.user_id
    is_admin = Permission.ADMIN_ACCESS in current_user.permissions

    if not (is_uploader or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only share documents you uploaded"
        )

    # Update access settings
    if share_request.access_level == DocumentAccess.RESTRICTED:
        document.access_level = DocumentAccess.RESTRICTED
        document.allowed_users.extend(share_request.user_ids)
        document.allowed_users = list(set(document.allowed_users))  # Remove duplicates
    else:
        document.access_level = share_request.access_level

    if share_request.expires_at:
        document.expires_at = share_request.expires_at

    document.updated_at = datetime.now()

    # Store updated document
    DOCUMENTS[document_id] = document

    # In production, send notifications if requested
    if share_request.notify:
        # Send email/notification to shared users
        pass

    return {
        "document_id": document_id,
        "shared_with": share_request.user_ids,
        "access_level": share_request.access_level.value,
        "expires_at": share_request.expires_at.isoformat() if share_request.expires_at else None,
        "notification_sent": share_request.notify
    }


@router.post("/{document_id}/version", response_model=Document)
async def upload_new_version(
    document_id: str,
    file: UploadFile = File(...),
    current_user: UserInfo = Depends(get_current_user)
):
    """Upload a new version of an existing document."""
    document = await get_document(document_id, current_user)

    # Check permission
    is_uploader = document.uploaded_by == current_user.user_id
    is_admin = Permission.ADMIN_ACCESS in current_user.permissions

    if not (is_uploader or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update documents you uploaded"
        )

    # Save previous version reference
    document.previous_versions.append(f"{document_id}_v{document.version}")

    # Save new file
    new_file_path = DOCUMENT_STORAGE_PATH / f"{document_id}_{file.filename}"
    with open(new_file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Update document
    document.version += 1
    document.size = len(content)
    document.uploaded_at = datetime.now()
    document.updated_at = datetime.now()

    # Store updated document
    DOCUMENTS[document_id] = document

    return document


@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: UserInfo = Depends(get_current_user)
):
    """Delete a document."""
    document = await get_document(document_id, current_user)

    # Check permission (only uploader or admin can delete)
    is_uploader = document.uploaded_by == current_user.user_id
    is_admin = Permission.ADMIN_ACCESS in current_user.permissions

    if not (is_uploader or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete documents you uploaded"
        )

    # Delete file (in production, delete from S3)
    for file in DOCUMENT_STORAGE_PATH.glob(f"{document_id}_*"):
        file.unlink()

    # Delete document record
    del DOCUMENTS[document_id]

    return {"message": "Document deleted successfully"}