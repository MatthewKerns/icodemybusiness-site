"""
Configuration for external integrations
"""

import os
from typing import Optional
from pydantic import BaseSettings, Field


class IntegrationConfig(BaseSettings):
    """Configuration for all external integrations"""

    # Convex Configuration
    convex_deployment_url: str = Field(
        default="https://your-deployment.convex.cloud",
        env="CONVEX_DEPLOYMENT_URL"
    )
    convex_api_key: str = Field(
        default="",
        env="CONVEX_API_KEY"
    )

    # Calendly Configuration
    calendly_webhook_token: str = Field(
        default="",
        env="CALENDLY_WEBHOOK_TOKEN"
    )
    calendly_api_key: str = Field(
        default="",
        env="CALENDLY_API_KEY"
    )

    # Unipile Configuration
    unipile_api_key: str = Field(
        default="",
        env="UNIPILE_API_KEY"
    )
    unipile_api_url: str = Field(
        default="https://api.unipile.com/v1",
        env="UNIPILE_API_URL"
    )
    unipile_webhook_secret: str = Field(
        default="",
        env="UNIPILE_WEBHOOK_SECRET"
    )

    # Claude Configuration
    anthropic_api_key: str = Field(
        default="",
        env="ANTHROPIC_API_KEY"
    )
    claude_model: str = Field(
        default="claude-3-opus-20240229",
        env="CLAUDE_MODEL"
    )

    # Stripe Configuration
    stripe_api_key: str = Field(
        default="",
        env="STRIPE_API_KEY"
    )
    stripe_webhook_secret: str = Field(
        default="",
        env="STRIPE_WEBHOOK_SECRET"
    )
    stripe_price_id: str = Field(
        default="",
        env="STRIPE_PRICE_ID"
    )

    # Server Configuration
    api_host: str = Field(
        default="0.0.0.0",
        env="API_HOST"
    )
    api_port: int = Field(
        default=8000,
        env="API_PORT"
    )
    environment: str = Field(
        default="development",
        env="ENVIRONMENT"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global config instance
config = IntegrationConfig()