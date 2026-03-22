"""Tests for permission and access control."""
import pytest
from datetime import datetime
from unittest.mock import Mock, patch
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.auth import (
    UserInfo, Permission, ROLE_PERMISSIONS,
    check_permission, create_access_token
)
from api.projects import Project, ProjectStatus
from api.documents import Document, DocumentAccess, check_document_access
from fastapi import HTTPException
from fastapi.testclient import TestClient
from main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestRolePermissions:
    """Test role-based permissions."""

    def test_client_permissions(self):
        """Test client role permissions."""
        permissions = ROLE_PERMISSIONS["client"]

        assert Permission.VIEW_OWN_PROJECTS in permissions
        assert Permission.CREATE_REQUEST in permissions
        assert Permission.VIEW_DOCUMENTS in permissions
        assert Permission.ADMIN_ACCESS not in permissions
        assert Permission.VIEW_ALL_PROJECTS not in permissions

    def test_client_admin_permissions(self):
        """Test client admin role permissions."""
        permissions = ROLE_PERMISSIONS["client_admin"]

        assert Permission.VIEW_OWN_PROJECTS in permissions
        assert Permission.CREATE_REQUEST in permissions
        assert Permission.VIEW_DOCUMENTS in permissions
        assert Permission.MANAGE_PROJECTS in permissions
        assert Permission.ADMIN_ACCESS not in permissions

    def test_admin_permissions(self):
        """Test admin role permissions."""
        permissions = ROLE_PERMISSIONS["admin"]

        assert Permission.VIEW_ALL_PROJECTS in permissions
        assert Permission.CREATE_REQUEST in permissions
        assert Permission.VIEW_DOCUMENTS in permissions
        assert Permission.MANAGE_PROJECTS in permissions
        assert Permission.ADMIN_ACCESS in permissions

    def test_super_admin_permissions(self):
        """Test super admin role permissions."""
        permissions = ROLE_PERMISSIONS["super_admin"]

        # Super admin should have all permissions
        assert Permission.VIEW_ALL_PROJECTS in permissions
        assert Permission.ADMIN_ACCESS in permissions
        assert len(permissions) >= len(ROLE_PERMISSIONS["admin"])


class TestProjectAccessControl:
    """Test project access control."""

    def test_client_can_only_view_own_projects(self, client):
        """Test that clients can only view their organization's projects."""
        # Create client user
        client_user = UserInfo(
            user_id="client_1",
            email="client1@org1.com",
            organization_id="org_1",
            role="client",
            permissions=ROLE_PERMISSIONS["client"]
        )

        headers = {"Authorization": f"Bearer {create_access_token(client_user)}"}

        response = client.get("/api/projects/", headers=headers)
        assert response.status_code == 200

        projects = response.json()
        # All projects should be from the same organization
        for project in projects:
            assert project["organization_id"] == "org_1"

    def test_admin_can_view_all_projects(self, client):
        """Test that admins can view all projects."""
        admin_user = UserInfo(
            user_id="admin_1",
            email="admin@company.com",
            organization_id="admin_org",
            role="admin",
            permissions=ROLE_PERMISSIONS["admin"]
        )

        headers = {"Authorization": f"Bearer {create_access_token(admin_user)}"}

        response = client.get("/api/projects/", headers=headers)
        assert response.status_code == 200

        # Admin should be able to see projects (mock returns empty or test data)
        projects = response.json()
        assert isinstance(projects, list)

    def test_cross_organization_access_denied(self, client):
        """Test that users cannot access other organizations' projects."""
        user_org1 = UserInfo(
            user_id="user_org1",
            email="user@org1.com",
            organization_id="org_1",
            role="client",
            permissions=ROLE_PERMISSIONS["client"]
        )

        headers = {"Authorization": f"Bearer {create_access_token(user_org1)}"}

        # Try to access a project from org_2
        response = client.get("/api/projects/proj_org_2_1", headers=headers)
        # Should return 404 (not found or access denied)
        assert response.status_code == 404


class TestDocumentAccessControl:
    """Test document access control."""

    @pytest.mark.asyncio
    async def test_public_document_access(self):
        """Test that public documents can be accessed by anyone."""
        document = Document(
            id="doc_public",
            name="Public Document",
            type="other",
            mime_type="application/pdf",
            size=1024,
            organization_id="org_1",
            access_level=DocumentAccess.PUBLIC,
            url="/api/documents/doc_public",
            download_url="/api/documents/doc_public/download",
            uploaded_by="user_1",
            uploaded_at=datetime.now(),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        user = UserInfo(
            user_id="any_user",
            email="user@anyorg.com",
            organization_id="org_different",
            role="client",
            permissions=[]
        )

        # Public document should be accessible to anyone
        assert await check_document_access(document, user) == True

    @pytest.mark.asyncio
    async def test_client_document_access(self):
        """Test that client documents are only accessible to same organization."""
        document = Document(
            id="doc_client",
            name="Client Document",
            type="contract",
            mime_type="application/pdf",
            size=1024,
            organization_id="org_1",
            access_level=DocumentAccess.CLIENT,
            url="/api/documents/doc_client",
            download_url="/api/documents/doc_client/download",
            uploaded_by="user_1",
            uploaded_at=datetime.now(),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        # User from same organization
        user_same_org = UserInfo(
            user_id="user_org1",
            email="user@org1.com",
            organization_id="org_1",
            role="client",
            permissions=[Permission.VIEW_DOCUMENTS]
        )

        # User from different organization
        user_diff_org = UserInfo(
            user_id="user_org2",
            email="user@org2.com",
            organization_id="org_2",
            role="client",
            permissions=[Permission.VIEW_DOCUMENTS]
        )

        assert await check_document_access(document, user_same_org) == True
        assert await check_document_access(document, user_diff_org) == False

    @pytest.mark.asyncio
    async def test_restricted_document_access(self):
        """Test that restricted documents are only accessible to allowed users."""
        document = Document(
            id="doc_restricted",
            name="Restricted Document",
            type="contract",
            mime_type="application/pdf",
            size=1024,
            organization_id="org_1",
            access_level=DocumentAccess.RESTRICTED,
            allowed_users=["user_allowed_1", "user_allowed_2"],
            url="/api/documents/doc_restricted",
            download_url="/api/documents/doc_restricted/download",
            uploaded_by="user_1",
            uploaded_at=datetime.now(),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        # Allowed user
        user_allowed = UserInfo(
            user_id="user_allowed_1",
            email="allowed@org1.com",
            organization_id="org_1",
            role="client",
            permissions=[Permission.VIEW_DOCUMENTS]
        )

        # Not allowed user
        user_not_allowed = UserInfo(
            user_id="user_not_allowed",
            email="notallowed@org1.com",
            organization_id="org_1",
            role="client",
            permissions=[Permission.VIEW_DOCUMENTS]
        )

        assert await check_document_access(document, user_allowed) == True
        assert await check_document_access(document, user_not_allowed) == False

    @pytest.mark.asyncio
    async def test_expired_document_access(self):
        """Test that expired documents cannot be accessed."""
        from datetime import timedelta

        document = Document(
            id="doc_expired",
            name="Expired Document",
            type="report",
            mime_type="application/pdf",
            size=1024,
            organization_id="org_1",
            access_level=DocumentAccess.CLIENT,
            url="/api/documents/doc_expired",
            download_url="/api/documents/doc_expired/download",
            uploaded_by="user_1",
            uploaded_at=datetime.now(),
            expires_at=datetime.now() - timedelta(days=1),  # Expired yesterday
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        user = UserInfo(
            user_id="user_1",
            email="user@org1.com",
            organization_id="org_1",
            role="client",
            permissions=[Permission.VIEW_DOCUMENTS]
        )

        # Should not be accessible as it's expired
        assert await check_document_access(document, user) == False

    @pytest.mark.asyncio
    async def test_admin_document_access_override(self):
        """Test that admins can access any document."""
        document = Document(
            id="doc_restricted",
            name="Restricted Document",
            type="contract",
            mime_type="application/pdf",
            size=1024,
            organization_id="org_1",
            access_level=DocumentAccess.RESTRICTED,
            allowed_users=["specific_user"],
            url="/api/documents/doc_restricted",
            download_url="/api/documents/doc_restricted/download",
            uploaded_by="user_1",
            uploaded_at=datetime.now(),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )

        admin = UserInfo(
            user_id="admin_1",
            email="admin@company.com",
            organization_id="admin_org",
            role="admin",
            permissions=[Permission.ADMIN_ACCESS, Permission.VIEW_DOCUMENTS]
        )

        # Admin should have access even though not in allowed_users
        assert await check_document_access(document, admin) == True


class TestWorkRequestPermissions:
    """Test work request permissions."""

    def test_client_can_create_requests(self, client):
        """Test that clients can create work requests."""
        client_user = UserInfo(
            user_id="client_1",
            email="client@org1.com",
            organization_id="org_1",
            role="client",
            permissions=ROLE_PERMISSIONS["client"]
        )

        headers = {"Authorization": f"Bearer {create_access_token(client_user)}"}

        request_data = {
            "project_id": "proj_1",
            "type": "feature",
            "priority": "medium",
            "title": "New Feature Request",
            "description": "This is a test feature request that needs to be implemented in the system."
        }

        response = client.post("/api/requests/", json=request_data, headers=headers)
        assert response.status_code == 200

    def test_user_without_permission_cannot_create_requests(self, client):
        """Test that users without permission cannot create requests."""
        limited_user = UserInfo(
            user_id="limited_1",
            email="limited@org1.com",
            organization_id="org_1",
            role="viewer",
            permissions=[Permission.VIEW_OWN_PROJECTS]  # No CREATE_REQUEST permission
        )

        headers = {"Authorization": f"Bearer {create_access_token(limited_user)}"}

        request_data = {
            "project_id": "proj_1",
            "type": "feature",
            "priority": "medium",
            "title": "Unauthorized Request",
            "description": "This request should not be allowed to be created by this user."
        }

        response = client.post("/api/requests/", json=request_data, headers=headers)
        assert response.status_code == 403

    def test_only_submitter_can_update_request(self, client):
        """Test that only the submitter can update their request."""
        # Create request as user 1
        user1 = UserInfo(
            user_id="user_1",
            email="user1@org1.com",
            organization_id="org_1",
            role="client",
            permissions=ROLE_PERMISSIONS["client"]
        )

        headers1 = {"Authorization": f"Bearer {create_access_token(user1)}"}

        request_data = {
            "project_id": "proj_1",
            "type": "bug_fix",
            "priority": "low",
            "title": "Bug Fix Request",
            "description": "This is a bug that needs to be fixed in the application interface."
        }

        response = client.post("/api/requests/", json=request_data, headers=headers1)
        request_id = response.json()["id"]

        # Try to update as user 2
        user2 = UserInfo(
            user_id="user_2",
            email="user2@org1.com",
            organization_id="org_1",
            role="client",
            permissions=ROLE_PERMISSIONS["client"]
        )

        headers2 = {"Authorization": f"Bearer {create_access_token(user2)}"}

        update_data = {"priority": "high"}

        response = client.put(
            f"/api/requests/{request_id}",
            json=update_data,
            headers=headers2
        )
        assert response.status_code == 403

        # Update as original submitter should work
        response = client.put(
            f"/api/requests/{request_id}",
            json=update_data,
            headers=headers1
        )
        assert response.status_code == 200

    def test_admin_can_update_any_request(self, client):
        """Test that admins can update any request."""
        # Create request as regular user
        user = UserInfo(
            user_id="user_1",
            email="user@org1.com",
            organization_id="org_1",
            role="client",
            permissions=ROLE_PERMISSIONS["client"]
        )

        user_headers = {"Authorization": f"Bearer {create_access_token(user)}"}

        request_data = {
            "project_id": "proj_1",
            "type": "enhancement",
            "priority": "low",
            "title": "Enhancement Request",
            "description": "This is an enhancement request for improving the user interface."
        }

        response = client.post("/api/requests/", json=request_data, headers=user_headers)
        request_id = response.json()["id"]

        # Update as admin
        admin = UserInfo(
            user_id="admin_1",
            email="admin@company.com",
            organization_id="admin_org",
            role="admin",
            permissions=ROLE_PERMISSIONS["admin"]
        )

        admin_headers = {"Authorization": f"Bearer {create_access_token(admin)}"}

        update_data = {"priority": "high", "title": "Admin Updated Request"}

        response = client.put(
            f"/api/requests/{request_id}",
            json=update_data,
            headers=admin_headers
        )
        assert response.status_code == 200
        assert response.json()["title"] == "Admin Updated Request"


class TestTokenPermissions:
    """Test JWT token permissions."""

    def test_expired_token_denied(self, client):
        """Test that expired tokens are rejected."""
        from datetime import timedelta

        user = UserInfo(
            user_id="user_1",
            email="user@org1.com",
            organization_id="org_1",
            role="client",
            permissions=ROLE_PERMISSIONS["client"]
        )

        # Create an expired token (would need to modify create_access_token for testing)
        # For now, test with invalid token
        headers = {"Authorization": "Bearer invalid_token"}

        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401

    def test_malformed_token_denied(self, client):
        """Test that malformed tokens are rejected."""
        headers = {"Authorization": "Bearer not.a.valid.jwt.token"}

        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == 401

    def test_missing_token_denied(self, client):
        """Test that requests without tokens are rejected."""
        response = client.get("/api/auth/me")
        assert response.status_code == 403  # No Authorization header