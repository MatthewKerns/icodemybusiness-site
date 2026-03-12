"""
Convex HTTP Client for Python
Provides interface to Convex backend via HTTP API.
"""

import os
import httpx
import json
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class ConvexClient:
    """HTTP client for Convex backend operations."""

    def __init__(
        self,
        deployment_url: Optional[str] = None,
        admin_key: Optional[str] = None
    ):
        """
        Initialize Convex client.

        Args:
            deployment_url: Convex deployment URL (e.g., https://your-app.convex.cloud)
            admin_key: Admin key for system operations (optional)
        """
        self.deployment_url = deployment_url or os.getenv("CONVEX_URL")
        self.admin_key = admin_key or os.getenv("CONVEX_ADMIN_KEY")

        if not self.deployment_url:
            raise ValueError("Convex deployment URL is required")

        # Remove trailing slash if present
        self.deployment_url = self.deployment_url.rstrip("/")
        self.base_url = self.deployment_url

        # Create HTTP client
        self.client = httpx.AsyncClient(
            timeout=30.0,
            headers={
                "Content-Type": "application/json",
            }
        )

        if self.admin_key:
            self.client.headers["Authorization"] = f"Convex {self.admin_key}"

    async def query(self, function_name: str, args: Dict[str, Any] = None) -> Any:
        """
        Execute a Convex query function.

        Args:
            function_name: Name of the Convex function (e.g., "clients:list")
            args: Arguments to pass to the function

        Returns:
            Query result from Convex
        """
        args = args or {}

        # Convert function name format (clients:list -> clients/list)
        function_path = function_name.replace(":", "/")

        url = f"{self.base_url}/api/query"

        payload = {
            "path": function_path,
            "args": args
        }

        try:
            response = await self.client.post(url, json=payload)

            if response.status_code == 200:
                result = response.json()
                return result.get("value", result)
            else:
                logger.error(f"Convex query failed: {response.status_code} - {response.text}")
                raise Exception(f"Convex query failed: {response.status_code}")

        except httpx.RequestError as e:
            logger.error(f"Request error: {e}")
            raise Exception(f"Failed to connect to Convex: {e}")

    async def mutate(self, function_name: str, args: Dict[str, Any] = None) -> Any:
        """
        Execute a Convex mutation function.

        Args:
            function_name: Name of the Convex function (e.g., "clients:create")
            args: Arguments to pass to the function

        Returns:
            Mutation result from Convex
        """
        args = args or {}

        # Convert function name format
        function_path = function_name.replace(":", "/")

        url = f"{self.base_url}/api/mutation"

        payload = {
            "path": function_path,
            "args": args
        }

        try:
            response = await self.client.post(url, json=payload)

            if response.status_code == 200:
                result = response.json()
                return result.get("value", result)
            else:
                logger.error(f"Convex mutation failed: {response.status_code} - {response.text}")
                raise Exception(f"Convex mutation failed: {response.status_code}")

        except httpx.RequestError as e:
            logger.error(f"Request error: {e}")
            raise Exception(f"Failed to connect to Convex: {e}")

    async def action(self, function_name: str, args: Dict[str, Any] = None) -> Any:
        """
        Execute a Convex action function.

        Args:
            function_name: Name of the Convex action
            args: Arguments to pass to the function

        Returns:
            Action result from Convex
        """
        args = args or {}

        # Convert function name format
        function_path = function_name.replace(":", "/")

        url = f"{self.base_url}/api/action"

        payload = {
            "path": function_path,
            "args": args
        }

        try:
            response = await self.client.post(url, json=payload)

            if response.status_code == 200:
                result = response.json()
                return result.get("value", result)
            else:
                logger.error(f"Convex action failed: {response.status_code} - {response.text}")
                raise Exception(f"Convex action failed: {response.status_code}")

        except httpx.RequestError as e:
            logger.error(f"Request error: {e}")
            raise Exception(f"Failed to connect to Convex: {e}")

    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()


# Singleton instance for the application
_convex_client: Optional[ConvexClient] = None


def get_convex_client() -> ConvexClient:
    """
    Get or create a singleton Convex client instance.

    Returns:
        ConvexClient instance
    """
    global _convex_client

    if _convex_client is None:
        _convex_client = ConvexClient()

    return _convex_client


# Mock implementation for development/testing when Convex is not available
class MockConvexClient:
    """Mock Convex client for development and testing."""

    def __init__(self):
        """Initialize mock client with sample data."""
        self.mock_data = {
            "clients": [
                {
                    "_id": "mock_client_1",
                    "_creationTime": 1710000000000,
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
                    "startDate": 1704067200000,
                    "updatedAt": 1710000000000
                },
                {
                    "_id": "mock_client_2",
                    "_creationTime": 1710000000000,
                    "companyName": "TechStart Solutions",
                    "primaryContact": {
                        "name": "Sarah Chen",
                        "email": "sarah@techstart.com",
                        "phone": "+1 555-0200",
                        "role": "CTO"
                    },
                    "status": "active",
                    "tier": "growth",
                    "monthlyRecurring": 3500,
                    "startDate": 1706745600000,
                    "updatedAt": 1710000000000
                }
            ],
            "projects": [
                {
                    "_id": "mock_proj_1",
                    "clientId": "mock_client_1",
                    "name": "Dashboard Redesign",
                    "description": "Complete UI/UX overhaul",
                    "type": "website",
                    "status": "in_progress",
                    "priority": "high",
                    "startDate": 1707696000000,
                    "dueDate": 1710374400000,
                    "budget": 15000,
                    "actualCost": 9750,
                    "teamMembers": ["Matthew Kerns", "Sarah Chen"],
                    "updatedAt": 1710000000000
                }
            ],
            "deliverables": [
                {
                    "_id": "mock_del_1",
                    "projectId": "mock_proj_1",
                    "clientId": "mock_client_1",
                    "name": "Design Mockups",
                    "type": "design",
                    "status": "delivered",
                    "assignedTo": "Sarah Chen",
                    "dueDate": 1708300800000,
                    "completedDate": 1708214400000,
                    "version": 2,
                    "feedback": "Excellent work!",
                    "updatedAt": 1710000000000
                }
            ],
            "messages": [
                {
                    "_id": "mock_msg_1",
                    "channel": "email",
                    "direction": "inbound",
                    "from": {
                        "name": "John Smith",
                        "email": "john@arisegroup.com"
                    },
                    "subject": "Re: Dashboard Progress",
                    "body": "Looking forward to seeing the new components.",
                    "isRead": False,
                    "clientId": "mock_client_1",
                    "createdAt": 1709913600000,
                    "updatedAt": 1709913600000
                }
            ]
        }

    async def query(self, function_name: str, args: Dict[str, Any] = None) -> Any:
        """Mock query implementation."""
        if "clients" in function_name:
            if "get" in function_name and args and "id" in args:
                return next(
                    (c for c in self.mock_data["clients"] if c["_id"] == args["id"]),
                    None
                )
            return self.mock_data["clients"]

        elif "projects" in function_name:
            projects = self.mock_data["projects"]
            if args:
                if "status" in args:
                    projects = [p for p in projects if p["status"] == args["status"]]
                if "clientId" in args:
                    projects = [p for p in projects if p["clientId"] == args["clientId"]]
            return projects

        elif "deliverables" in function_name:
            return self.mock_data["deliverables"]

        elif "messages" in function_name:
            return self.mock_data["messages"]

        return []

    async def mutate(self, function_name: str, args: Dict[str, Any] = None) -> Any:
        """Mock mutation implementation."""
        if "create" in function_name:
            return {"_id": f"mock_{datetime.now().timestamp()}", **args}
        elif "update" in function_name:
            return {"success": True, "updated": 1}
        elif "delete" in function_name:
            return {"success": True, "deleted": 1}
        return {"success": True}

    async def action(self, function_name: str, args: Dict[str, Any] = None) -> Any:
        """Mock action implementation."""
        return {"success": True, "action": function_name, "args": args}

    async def close(self):
        """Mock close method."""
        pass


def get_mock_convex_client() -> MockConvexClient:
    """Get a mock Convex client for testing."""
    return MockConvexClient()