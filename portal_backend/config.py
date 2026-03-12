"""Configuration settings for the portal backend."""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Clerk Authentication
    clerk_secret_key: str = os.getenv("CLERK_SECRET_KEY", "")
    clerk_publishable_key: str = os.getenv("CLERK_PUBLISHABLE_KEY", "")
    clerk_jwt_verification_key: str = os.getenv("CLERK_JWT_VERIFICATION_KEY", "")

    # Convex Configuration
    convex_url: str = os.getenv("CONVEX_URL", "https://your-project.convex.cloud")
    convex_deployment_name: str = os.getenv("CONVEX_DEPLOYMENT_NAME", "production")

    # Redis Configuration
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # API Configuration
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8001"))
    cors_origins: List[str] = [
        "http://localhost:3000",
        "https://portal.icodemybusiness.com"
    ]

    # WebSocket Configuration
    ws_host: str = os.getenv("WS_HOST", "0.0.0.0")
    ws_port: int = int(os.getenv("WS_PORT", "8002"))

    # Security
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    # Role-based access control
    client_roles = ["client", "client_admin"]
    admin_roles = ["admin", "super_admin"]

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()