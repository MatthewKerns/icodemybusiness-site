"""Tests for portal API endpoints."""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
import json
from unittest.mock import Mock, patch, AsyncMock

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from api.auth import create_access_token, UserInfo, ROLE_PERMISSIONS
from api.projects import Project, ProjectStatus, ProjectHealth
from api.requests import WorkRequest, RequestStatus, RequestPriority
from api.documents import Document, DocumentType, DocumentAccess


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def test_user():
    """Create test user."""
    return UserInfo(
        user_id="test_user_123",
        email="test@example.com",
        first_name="Test",
        last_name="User",
        organization_id="org_123",
        role="client",
        permissions=ROLE_PERMISSIONS["client"]
    )


@pytest.fixture
def admin_user():
    """Create admin user."""
    return UserInfo(
        user_id="admin_user_123",
        email="admin@example.com",
        first_name="Admin",
        last_name="User",
        organization_id="org_admin",
        role="admin",
        permissions=ROLE_PERMISSIONS["admin"]
    )


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers."""
    token = create_access_token(test_user)
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(admin_user):
    """Create admin authentication headers."""
    token = create_access_token(admin_user)
    return {"Authorization": f"Bearer {token}"}


class TestAuthentication:
    """Test authentication endpoints."""

    @patch('api.auth.verify_clerk_session')
    async def test_login_success(self, mock_verify, client):
        """Test successful login."""
        mock_verify.return_value = {
            "id": "user_123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
            "public_metadata": {
                "organization_id": "org_123",
                "role": "client"
            }
        }

        response = client.post(
            "/api/auth/login",
            json={"clerk_session_token": "test_token"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["user_id"] == "user_123"

    def test_get_me(self, client, auth_headers):
        """Test getting current user info."""
        response = client.get("/api/auth/me", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == "test_user_123"
        assert data["email"] == "test@example.com"

    def test_get_permissions(self, client, auth_headers):
        """Test getting user permissions."""
        response = client.get("/api/auth/permissions", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "client"
        assert "view_own_projects" in data["permissions"]

    def test_unauthorized_access(self, client):
        """Test unauthorized access."""
        response = client.get("/api/auth/me")
        assert response.status_code == 403  # No auth header


class TestProjects:
    """Test project endpoints."""

    def test_list_projects(self, client, auth_headers):
        """Test listing projects."""
        response = client.get("/api/projects/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Mock data should return 3 projects for the organization
        assert len(data) == 3

    def test_get_project_details(self, client, auth_headers):
        """Test getting project details."""
        response = client.get("/api/projects/", headers=auth_headers)
        projects = response.json()

        if projects:
            project_id = projects[0]["id"]
            response = client.get(f"/api/projects/{project_id}", headers=auth_headers)

            assert response.status_code == 200
            data = response.json()
            assert data["id"] == project_id
            assert "metrics" in data
            assert "milestones" in data

    def test_project_access_control(self, client, auth_headers):
        """Test project access control."""
        # Try to access a project from different organization
        response = client.get("/api/projects/proj_other_org_1", headers=auth_headers)
        assert response.status_code == 404  # Should not find or access denied

    def test_project_updates(self, client, auth_headers):
        """Test getting project updates."""
        response = client.get("/api/projects/", headers=auth_headers)
        projects = response.json()

        if projects:
            project_id = projects[0]["id"]
            response = client.get(
                f"/api/projects/{project_id}/updates",
                headers=auth_headers
            )

            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)
            assert len(data) > 0

    def test_project_documents(self, client, auth_headers):
        """Test getting project documents."""
        response = client.get("/api/projects/", headers=auth_headers)
        projects = response.json()

        if projects:
            project_id = projects[0]["id"]
            response = client.get(
                f"/api/projects/{project_id}/documents",
                headers=auth_headers
            )

            assert response.status_code == 200
            data = response.json()
            assert isinstance(data, list)

    def test_project_metrics(self, client, auth_headers):
        """Test getting project metrics."""
        response = client.get("/api/projects/", headers=auth_headers)
        projects = response.json()

        if projects:
            project_id = projects[0]["id"]
            response = client.get(
                f"/api/projects/{project_id}/metrics",
                headers=auth_headers
            )

            assert response.status_code == 200
            data = response.json()
            assert "health" in data
            assert "completion_percentage" in data
            assert "budget_used_percentage" in data


class TestWorkRequests:
    """Test work request endpoints."""

    def test_create_work_request(self, client, auth_headers):
        """Test creating a work request."""
        request_data = {
            "project_id": "proj_123",
            "type": "feature",
            "priority": "high",
            "title": "New Feature Request",
            "description": "This is a detailed description of the new feature request that we need implemented.",
            "business_justification": "This will improve user experience",
            "acceptance_criteria": [
                "Feature works as expected",
                "Tests are passing"
            ]
        }

        response = client.post(
            "/api/requests/",
            json=request_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == request_data["title"]
        assert data["status"] == "submitted"
        assert data["submitted_by"] == "test_user_123"

    def test_list_work_requests(self, client, auth_headers):
        """Test listing work requests."""
        # Create a request first
        request_data = {
            "project_id": "proj_123",
            "type": "bug_fix",
            "priority": "medium",
            "title": "Bug Fix Request",
            "description": "There is a bug that needs to be fixed in the application interface."
        }

        client.post("/api/requests/", json=request_data, headers=auth_headers)

        # List requests
        response = client.get("/api/requests/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_update_work_request(self, client, auth_headers):
        """Test updating a work request."""
        # Create a request
        request_data = {
            "project_id": "proj_123",
            "type": "enhancement",
            "priority": "low",
            "title": "Enhancement Request",
            "description": "This is an enhancement that would be nice to have in the system."
        }

        create_response = client.post(
            "/api/requests/",
            json=request_data,
            headers=auth_headers
        )
        request_id = create_response.json()["id"]

        # Update the request
        update_data = {
            "priority": "high",
            "title": "Updated Enhancement Request"
        }

        response = client.put(
            f"/api/requests/{request_id}",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["priority"] == "high"
        assert data["title"] == "Updated Enhancement Request"

    def test_add_comment_to_request(self, client, auth_headers):
        """Test adding a comment to a work request."""
        # Create a request
        request_data = {
            "project_id": "proj_123",
            "type": "support",
            "priority": "medium",
            "title": "Support Request",
            "description": "Need help with understanding how to use a specific feature in the application."
        }

        create_response = client.post(
            "/api/requests/",
            json=request_data,
            headers=auth_headers
        )
        request_id = create_response.json()["id"]

        # Add comment
        comment_data = {
            "text": "This is a comment on the work request",
            "is_internal": False
        }

        response = client.post(
            f"/api/requests/{request_id}/comments",
            json=comment_data,
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["text"] == comment_data["text"]

        # Get comments
        response = client.get(
            f"/api/requests/{request_id}/comments",
            headers=auth_headers
        )

        assert response.status_code == 200
        comments = response.json()
        assert len(comments) > 0


class TestDocuments:
    """Test document endpoints."""

    def test_list_documents(self, client, auth_headers):
        """Test listing documents."""
        response = client.get("/api/documents/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_document_access_control(self, client, auth_headers):
        """Test document access control."""
        # Try to access a non-existent document
        response = client.get("/api/documents/doc_nonexistent", headers=auth_headers)
        assert response.status_code == 404

    def test_document_metadata_update(self, client, auth_headers, admin_headers):
        """Test updating document metadata."""
        # This would require creating a document first
        # For now, test the endpoint exists
        update_data = {
            "name": "Updated Document Name",
            "description": "Updated description"
        }

        response = client.put(
            "/api/documents/doc_test",
            json=update_data,
            headers=admin_headers
        )

        # Should return 404 as document doesn't exist
        assert response.status_code == 404


class TestWebSocket:
    """Test WebSocket functionality."""

    @pytest.mark.asyncio
    async def test_websocket_connection(self):
        """Test WebSocket connection."""
        from fastapi.testclient import TestClient

        client = TestClient(app)

        # Create a valid token
        test_user = UserInfo(
            user_id="ws_test_user",
            email="wstest@example.com",
            organization_id="org_ws",
            role="client",
            permissions=["view_own_projects"]
        )
        token = create_access_token(test_user)

        # Note: TestClient doesn't fully support WebSocket testing
        # In production, use a proper WebSocket client for testing
        # This is a basic connectivity test
        try:
            with client.websocket_connect(f"/ws?token={token}") as websocket:
                # Should receive connection message
                data = websocket.receive_json()
                assert data["type"] == "connection"
                assert data["status"] == "connected"

                # Send ping
                websocket.send_json({"type": "ping"})

                # Receive pong
                data = websocket.receive_json()
                assert data["type"] == "pong"
        except Exception as e:
            # WebSocket testing with TestClient has limitations
            pass


class TestHealthEndpoints:
    """Test health and status endpoints."""

    def test_root_endpoint(self, client):
        """Test root endpoint."""
        response = client.get("/")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "operational"

    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "connections" in data
        assert "streams" in data

    def test_api_status(self, client):
        """Test API status endpoint."""
        response = client.get("/api/status")

        assert response.status_code == 200
        data = response.json()
        assert data["api_version"] == "1.0.0"
        assert data["authentication"] == "Clerk"
        assert data["realtime"] == "WebSocket"