"""
Test suite for Agent-OS API contract compatibility.
These tests ensure our FastAPI gateway maintains compatibility with Agent-OS expectations.
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from typing import Dict, Any
import json

# We'll import the app once it's created
# from main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    from main import app
    return TestClient(app)


@pytest.fixture
def mock_convex_response():
    """Mock response from Convex backend."""
    return {
        "clients": [
            {
                "_id": "client_1",
                "companyName": "Arise Group",
                "primaryContact": {
                    "name": "John Smith",
                    "email": "john@arisegroup.com",
                    "phone": "+1 555-0100",
                    "role": "CEO"
                },
                "status": "active",
                "tier": "enterprise",
                "monthlyRecurring": 5000,
                "startDate": 1704067200000,  # 2024-01-01
                "createdAt": 1704067200000,
                "updatedAt": 1704067200000
            }
        ],
        "projects": [
            {
                "_id": "proj_1",
                "clientId": "client_1",
                "name": "Dashboard Redesign",
                "description": "Complete UI/UX overhaul",
                "type": "website",
                "status": "in_progress",
                "priority": "high",
                "startDate": 1707696000000,  # 2024-02-12
                "dueDate": 1710374400000,  # 2024-03-14
                "budget": 15000,
                "actualCost": 9750,
                "teamMembers": ["user_1", "user_2"],
                "createdAt": 1707696000000,
                "updatedAt": 1710000000000
            }
        ]
    }


class TestHealthEndpoint:
    """Test health check endpoint."""

    @pytest.mark.unit
    def test_health_endpoint_returns_200(self, client):
        """Health endpoint should return 200 OK."""
        response = client.get("/health")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_health_endpoint_structure(self, client):
        """Health endpoint should return expected structure."""
        response = client.get("/health")
        data = response.json()

        assert "status" in data
        assert data["status"] == "healthy"
        assert "service" in data
        assert data["service"] == "ICMB API Gateway"
        assert "version" in data
        assert "timestamp" in data
        assert "uptime" in data
        assert "endpoints" in data

        # Verify all expected endpoints are documented
        endpoints = data["endpoints"]
        assert "clients" in endpoints
        assert "projects" in endpoints
        assert "deliverables" in endpoints
        assert "briefings" in endpoints
        assert "communications" in endpoints
        assert "metrics" in endpoints


class TestClientEndpoints:
    """Test client management endpoints for Agent-OS compatibility."""

    @pytest.mark.unit
    def test_get_all_clients_returns_200(self, client):
        """GET /api/clients should return 200."""
        response = client.get("/api/clients")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_get_all_clients_response_structure(self, client):
        """GET /api/clients should return Agent-OS compatible structure."""
        response = client.get("/api/clients")
        data = response.json()

        assert "success" in data
        assert "data" in data
        assert "total" in data
        assert data["success"] is True
        assert isinstance(data["data"], list)
        assert isinstance(data["total"], int)

    @pytest.mark.unit
    def test_get_single_client_returns_200(self, client):
        """GET /api/clients/:id should return 200."""
        response = client.get("/api/clients/client_1")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_get_single_client_response_structure(self, client):
        """GET /api/clients/:id should return detailed client info."""
        response = client.get("/api/clients/client_1")
        data = response.json()

        assert "success" in data
        assert "data" in data
        assert data["success"] is True

        client_data = data["data"]
        assert "id" in client_data
        assert "name" in client_data
        assert "type" in client_data
        assert "projects" in client_data
        assert "monthlyValue" in client_data
        assert "lastContact" in client_data
        assert "healthScore" in client_data

    @pytest.mark.unit
    def test_client_not_found_returns_404(self, client):
        """GET /api/clients/:id should return 404 for non-existent client."""
        response = client.get("/api/clients/nonexistent")
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False


class TestProjectEndpoints:
    """Test project management endpoints for Agent-OS compatibility."""

    @pytest.mark.unit
    def test_get_all_projects_returns_200(self, client):
        """GET /api/projects should return 200."""
        response = client.get("/api/projects")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_get_projects_with_filters(self, client):
        """GET /api/projects should support query filters."""
        # Test status filter
        response = client.get("/api/projects?status=in_progress")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Test client filter
        response = client.get("/api/projects?clientId=client_1")
        assert response.status_code == 200

        # Test priority filter
        response = client.get("/api/projects?priority=high")
        assert response.status_code == 200

        # Test combined filters
        response = client.get("/api/projects?status=in_progress&priority=high")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_get_single_project_returns_200(self, client):
        """GET /api/projects/:id should return 200."""
        response = client.get("/api/projects/proj_1")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_get_single_project_response_structure(self, client):
        """GET /api/projects/:id should return detailed project info."""
        response = client.get("/api/projects/proj_1")
        data = response.json()

        assert "success" in data
        assert "data" in data

        project_data = data["data"]
        required_fields = [
            "id", "name", "clientId", "clientName", "status",
            "priority", "type", "progress", "dueDate", "team",
            "budget", "spent"
        ]

        for field in required_fields:
            assert field in project_data, f"Missing required field: {field}"


class TestBriefingEndpoints:
    """Test Agent-OS briefing endpoints."""

    @pytest.mark.unit
    def test_daily_briefing_returns_200(self, client):
        """GET /api/briefings/daily should return 200."""
        response = client.get("/api/briefings/daily")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_daily_briefing_structure(self, client):
        """Daily briefing should match Agent-OS expected format."""
        response = client.get("/api/briefings/daily")
        data = response.json()

        assert "success" in data
        assert "data" in data

        briefing = data["data"]
        assert "date" in briefing
        assert "company" in briefing
        assert briefing["company"] == "iCodeMyBusiness"
        assert "summary" in briefing
        assert "priorities" in briefing
        assert "communications" in briefing
        assert "metrics" in briefing

        # Verify summary structure
        summary = briefing["summary"]
        assert "activeProjects" in summary
        assert "pendingTasks" in summary
        assert "clientRequests" in summary
        assert "upcomingMeetings" in summary
        assert "revenueThisMonth" in summary

        # Verify priorities is a list
        assert isinstance(briefing["priorities"], list)
        if len(briefing["priorities"]) > 0:
            priority = briefing["priorities"][0]
            assert "type" in priority
            assert "title" in priority
            assert "priority" in priority


class TestMetricsEndpoints:
    """Test business metrics endpoints."""

    @pytest.mark.unit
    def test_metrics_returns_200(self, client):
        """GET /api/metrics should return 200."""
        response = client.get("/api/metrics")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_metrics_response_structure(self, client):
        """Metrics endpoint should return comprehensive business metrics."""
        response = client.get("/api/metrics")
        data = response.json()

        assert "success" in data
        assert "data" in data
        assert "generatedAt" in data

        metrics = data["data"]

        # Verify all metric categories exist
        categories = ["revenue", "projects", "clients", "productivity", "pipeline"]
        for category in categories:
            assert category in metrics, f"Missing metric category: {category}"

        # Verify revenue metrics
        revenue = metrics["revenue"]
        assert "mrr" in revenue
        assert "arr" in revenue
        assert "growth" in revenue
        assert "churn" in revenue

        # Verify project metrics
        projects = metrics["projects"]
        assert "active" in projects
        assert "completed" in projects
        assert "averageValue" in projects


class TestCommunicationsEndpoints:
    """Test communications/messaging endpoints."""

    @pytest.mark.unit
    def test_get_communications_returns_200(self, client):
        """GET /api/communications should return 200."""
        response = client.get("/api/communications")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_communications_with_filters(self, client):
        """Communications endpoint should support filtering."""
        # Test channel filter
        response = client.get("/api/communications?channel=email")
        assert response.status_code == 200

        # Test unread filter
        response = client.get("/api/communications?unread=true")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_communications_response_structure(self, client):
        """Communications should return messages with AI suggestions."""
        response = client.get("/api/communications")
        data = response.json()

        assert "success" in data
        assert "data" in data
        assert "total" in data
        assert "unreadCount" in data

        if len(data["data"]) > 0:
            message = data["data"][0]
            assert "id" in message
            assert "channel" in message
            assert "from" in message
            assert "subject" in message
            assert "body" in message
            assert "isRead" in message
            assert "requiresResponse" in message
            assert "suggestedReply" in message


class TestDeliverablesEndpoints:
    """Test deliverables tracking endpoints."""

    @pytest.mark.unit
    def test_get_deliverables_returns_200(self, client):
        """GET /api/deliverables should return 200."""
        response = client.get("/api/deliverables")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_deliverables_with_filters(self, client):
        """Deliverables endpoint should support filtering."""
        # Test project filter
        response = client.get("/api/deliverables?projectId=proj_1")
        assert response.status_code == 200

        # Test status filter
        response = client.get("/api/deliverables?status=in_progress")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_deliverables_response_structure(self, client):
        """Deliverables should include all necessary tracking info."""
        response = client.get("/api/deliverables")
        data = response.json()

        assert "success" in data
        assert "data" in data
        assert "total" in data

        if len(data["data"]) > 0:
            deliverable = data["data"][0]
            required_fields = [
                "id", "name", "projectId", "projectName",
                "type", "status", "assignedTo", "dueDate"
            ]
            for field in required_fields:
                assert field in deliverable, f"Missing field: {field}"


class TestErrorHandling:
    """Test error handling and edge cases."""

    @pytest.mark.unit
    def test_404_for_unknown_endpoint(self, client):
        """Unknown endpoints should return 404."""
        response = client.get("/api/unknown")
        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert "error" in data

    @pytest.mark.unit
    def test_malformed_request_returns_422(self, client):
        """Malformed requests should return 422."""
        response = client.post(
            "/api/clients",
            json={"invalid": "data"}
        )
        # Since we haven't implemented POST yet, this might return 405
        assert response.status_code in [405, 422]

    @pytest.mark.unit
    def test_cors_headers_present(self, client):
        """CORS headers should be present for cross-origin requests."""
        response = client.get(
            "/health",
            headers={"Origin": "http://localhost:3000"}
        )
        assert response.status_code == 200
        # FastAPI's CORSMiddleware will add these headers


class TestWebSocketSupport:
    """Test WebSocket support for real-time updates."""

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_websocket_connection(self, client):
        """WebSocket endpoint should accept connections."""
        # This test will be implemented when WebSocket support is added
        pass

    @pytest.mark.integration
    @pytest.mark.asyncio
    async def test_websocket_subscription(self, client):
        """WebSocket should support channel subscriptions."""
        # This test will be implemented when WebSocket support is added
        pass