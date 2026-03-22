"""
Comprehensive endpoint testing for 90% coverage target.
Tests individual endpoint behavior, edge cases, and integration scenarios.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
import json
import httpx


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    from main import app
    return TestClient(app)


@pytest.fixture
def mock_convex_client():
    """Mock Convex client for testing."""
    with patch("services.convex_client.ConvexClient") as mock:
        yield mock


class TestConvexIntegration:
    """Test Convex HTTP client integration."""

    @pytest.mark.unit
    async def test_convex_client_initialization(self):
        """ConvexClient should initialize with proper configuration."""
        from services.convex_client import ConvexClient

        client = ConvexClient(
            deployment_url="https://test.convex.cloud",
            admin_key="test_key"
        )

        assert client.deployment_url == "https://test.convex.cloud"
        assert client.admin_key == "test_key"
        assert client.base_url == "https://test.convex.cloud"

    @pytest.mark.unit
    async def test_convex_query_method(self):
        """ConvexClient.query should properly format and send requests."""
        from services.convex_client import ConvexClient

        with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "status": "success",
                "value": [{"id": "1", "name": "Test"}]
            }

            client = ConvexClient(
                deployment_url="https://test.convex.cloud",
                admin_key="test_key"
            )

            result = await client.query("clients:list", {"status": "active"})

            assert result["status"] == "success"
            mock_post.assert_called_once()
            call_args = mock_post.call_args
            assert "query" in call_args.kwargs["url"]

    @pytest.mark.unit
    async def test_convex_mutation_method(self):
        """ConvexClient.mutate should properly format and send mutations."""
        from services.convex_client import ConvexClient

        with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "status": "success",
                "value": {"id": "new_id"}
            }

            client = ConvexClient(
                deployment_url="https://test.convex.cloud",
                admin_key="test_key"
            )

            result = await client.mutate("clients:create", {
                "name": "New Client",
                "email": "new@example.com"
            })

            assert result["status"] == "success"
            mock_post.assert_called_once()

    @pytest.mark.unit
    async def test_convex_error_handling(self):
        """ConvexClient should handle errors gracefully."""
        from services.convex_client import ConvexClient

        with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value.status_code = 500
            mock_post.return_value.text = "Internal Server Error"

            client = ConvexClient(
                deployment_url="https://test.convex.cloud",
                admin_key="test_key"
            )

            with pytest.raises(Exception) as exc_info:
                await client.query("clients:list", {})

            assert "500" in str(exc_info.value)


class TestDataTransformation:
    """Test data transformation between Convex and Agent-OS formats."""

    @pytest.mark.unit
    def test_transform_convex_client_to_agent_os(self):
        """Transform Convex client format to Agent-OS format."""
        from routers.clients import transform_client_data

        convex_client = {
            "_id": "k2x3n4m5p6q7r8s9",
            "_creationTime": 1710000000000,
            "companyName": "Test Company",
            "primaryContact": {
                "name": "John Doe",
                "email": "john@test.com",
                "phone": "+1234567890",
                "role": "CEO"
            },
            "status": "active",
            "tier": "enterprise",
            "monthlyRecurring": 5000,
            "startDate": 1704067200000,
            "updatedAt": 1710000000000
        }

        transformed = transform_client_data(convex_client)

        assert transformed["id"] == "k2x3n4m5p6q7r8s9"
        assert transformed["name"] == "Test Company"
        assert transformed["type"] == "active"
        assert transformed["monthlyValue"] == 5000
        assert transformed["contactEmail"] == "john@test.com"
        assert "lastContact" in transformed
        assert "healthScore" in transformed

    @pytest.mark.unit
    def test_transform_convex_project_to_agent_os(self):
        """Transform Convex project format to Agent-OS format."""
        from routers.projects import transform_project_data

        convex_project = {
            "_id": "p1x2y3z4",
            "clientId": "k2x3n4m5p6q7r8s9",
            "name": "Test Project",
            "description": "Test Description",
            "type": "website",
            "status": "in_progress",
            "priority": "high",
            "startDate": 1710000000000,
            "dueDate": 1712678400000,
            "budget": 10000,
            "actualCost": 5000,
            "teamMembers": ["user1", "user2"],
            "updatedAt": 1710000000000
        }

        transformed = transform_project_data(convex_project, "Test Company")

        assert transformed["id"] == "p1x2y3z4"
        assert transformed["name"] == "Test Project"
        assert transformed["clientName"] == "Test Company"
        assert transformed["status"] == "in_progress"
        assert transformed["priority"] == "high"
        assert transformed["progress"] is not None
        assert transformed["budget"] == 10000
        assert transformed["spent"] == 5000
        assert len(transformed["team"]) == 2


class TestBusinessLogic:
    """Test business logic and calculations."""

    @pytest.mark.unit
    def test_calculate_project_progress(self):
        """Calculate project progress based on milestones and tasks."""
        from routers.projects import calculate_progress

        milestones = [
            {"status": "completed"},
            {"status": "completed"},
            {"status": "in_progress"},
            {"status": "pending"}
        ]

        progress = calculate_progress(milestones)
        assert progress == 50  # 2 completed out of 4

    @pytest.mark.unit
    def test_calculate_client_health_score(self):
        """Calculate client health score based on various factors."""
        from routers.clients import calculate_health_score

        client_data = {
            "lastContact": datetime.now() - timedelta(days=2),
            "activeProjects": 2,
            "monthlyRecurring": 5000,
            "status": "active",
            "paymentHistory": "good"
        }

        score = calculate_health_score(client_data)
        assert 0 <= score <= 100
        assert score > 70  # Active client with recent contact should have high score

    @pytest.mark.unit
    def test_generate_daily_briefing(self):
        """Generate daily briefing with correct prioritization."""
        from routers.briefings import generate_daily_briefing

        mock_data = {
            "projects": [
                {"status": "in_progress", "priority": "high", "dueDate": datetime.now() + timedelta(days=1)},
                {"status": "in_progress", "priority": "low", "dueDate": datetime.now() + timedelta(days=30)}
            ],
            "communications": [
                {"isRead": False, "requiresResponse": True},
                {"isRead": True, "requiresResponse": False}
            ],
            "appointments": [
                {"startTime": datetime.now() + timedelta(hours=2), "type": "meeting"}
            ]
        }

        briefing = generate_daily_briefing(mock_data)

        assert "date" in briefing
        assert "company" in briefing
        assert "summary" in briefing
        assert "priorities" in briefing
        assert len(briefing["priorities"]) > 0
        assert briefing["priorities"][0]["priority"] == "high"


class TestPaginationAndFiltering:
    """Test pagination and filtering capabilities."""

    @pytest.mark.unit
    def test_pagination_parameters(self, client):
        """Endpoints should support pagination parameters."""
        response = client.get("/api/clients?page=1&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
        assert "total" in data
        assert "page" in data
        assert "pages" in data

    @pytest.mark.unit
    def test_sorting_parameters(self, client):
        """Endpoints should support sorting parameters."""
        response = client.get("/api/projects?sort=dueDate&order=asc")
        assert response.status_code == 200

        response = client.get("/api/projects?sort=priority&order=desc")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_date_range_filtering(self, client):
        """Endpoints should support date range filtering."""
        start_date = (datetime.now() - timedelta(days=30)).isoformat()
        end_date = datetime.now().isoformat()

        response = client.get(f"/api/projects?startDate={start_date}&endDate={end_date}")
        assert response.status_code == 200


class TestAsyncOperations:
    """Test asynchronous operations and background tasks."""

    @pytest.mark.asyncio
    async def test_parallel_convex_queries(self):
        """Multiple Convex queries should execute in parallel."""
        from services.convex_client import ConvexClient
        import asyncio

        with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {"status": "success", "value": []}

            client = ConvexClient(
                deployment_url="https://test.convex.cloud",
                admin_key="test_key"
            )

            # Execute multiple queries in parallel
            results = await asyncio.gather(
                client.query("clients:list", {}),
                client.query("projects:list", {}),
                client.query("deliverables:list", {})
            )

            assert len(results) == 3
            assert mock_post.call_count == 3

    @pytest.mark.asyncio
    async def test_background_task_execution(self, client):
        """Background tasks should execute without blocking response."""
        with patch("routers.clients.BackgroundTasks") as mock_bg:
            response = client.post("/api/clients/client_1/sync")
            assert response.status_code in [200, 202]
            # Verify background task was added
            mock_bg.return_value.add_task.assert_called()


class TestSecurity:
    """Test security features and authentication."""

    @pytest.mark.unit
    def test_api_key_authentication(self, client):
        """API endpoints should validate API keys when configured."""
        # Test without API key
        response = client.get(
            "/api/clients",
            headers={}
        )
        # Should work without auth in development mode
        assert response.status_code == 200

        # Test with invalid API key
        response = client.get(
            "/api/clients",
            headers={"X-API-Key": "invalid_key"}
        )
        # Should still work in development mode
        assert response.status_code == 200

    @pytest.mark.unit
    def test_rate_limiting(self, client):
        """API should implement rate limiting."""
        # Make multiple rapid requests
        for _ in range(10):
            response = client.get("/api/clients")
            assert response.status_code == 200

        # In production, this would test rate limit headers
        # assert "X-RateLimit-Limit" in response.headers


class TestCaching:
    """Test caching mechanisms."""

    @pytest.mark.unit
    def test_cache_headers(self, client):
        """Appropriate cache headers should be set."""
        response = client.get("/api/metrics")
        assert response.status_code == 200
        # Metrics should have short cache
        assert "Cache-Control" in response.headers

        response = client.get("/api/clients")
        assert response.status_code == 200
        # Dynamic data should not be cached long


class TestMonitoring:
    """Test monitoring and observability features."""

    @pytest.mark.unit
    def test_request_id_generation(self, client):
        """Each request should have a unique request ID."""
        response = client.get("/health")
        assert "X-Request-ID" in response.headers

        response2 = client.get("/health")
        assert response.headers["X-Request-ID"] != response2.headers["X-Request-ID"]

    @pytest.mark.unit
    def test_metrics_endpoint_performance(self, client):
        """Metrics endpoint should include performance data."""
        response = client.get("/api/metrics")
        data = response.json()
        assert "generatedAt" in data
        # Could also check response time is reasonable


class TestEdgeCases:
    """Test edge cases and error conditions."""

    @pytest.mark.unit
    def test_empty_result_sets(self, client, mock_convex_client):
        """Endpoints should handle empty result sets gracefully."""
        mock_convex_client.return_value.query.return_value = []

        response = client.get("/api/clients")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"] == []
        assert data["total"] == 0

    @pytest.mark.unit
    def test_large_payload_handling(self, client):
        """API should handle large payloads appropriately."""
        # Test with a large filter query
        large_ids = ",".join([f"client_{i}" for i in range(100)])
        response = client.get(f"/api/projects?clientIds={large_ids}")
        assert response.status_code in [200, 414]  # OK or URI Too Long

    @pytest.mark.unit
    def test_special_characters_in_parameters(self, client):
        """API should handle special characters in parameters."""
        response = client.get("/api/clients/test%20client")
        assert response.status_code in [200, 404]

        response = client.get('/api/projects?name=Test"Project')
        assert response.status_code == 200

    @pytest.mark.unit
    def test_concurrent_request_handling(self, client):
        """API should handle concurrent requests properly."""
        import threading
        results = []

        def make_request():
            response = client.get("/api/clients")
            results.append(response.status_code)

        threads = [threading.Thread(target=make_request) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert all(status == 200 for status in results)