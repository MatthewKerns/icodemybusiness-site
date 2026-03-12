"""
ICMB FastAPI Gateway - Main Application
Provides Agent-OS compatible API endpoints with Convex backend integration.
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os
import time
import uuid
from datetime import datetime
from dotenv import load_dotenv
import logging

# Import routers
from routers import clients, projects, deliverables, briefings, communications, metrics

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Application metadata
APP_NAME = "ICMB API Gateway"
APP_VERSION = "1.0.0"
APP_DESCRIPTION = """
FastAPI Gateway for iCodeMyBusiness operations.
Provides Agent-OS compatible endpoints with Convex backend integration.
"""

# Track application start time for uptime calculation
START_TIME = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle."""
    logger.info(f"Starting {APP_NAME} v{APP_VERSION}")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"Convex URL: {os.getenv('CONVEX_URL', 'Not configured')}")

    # Initialize any necessary connections or resources
    yield

    # Cleanup on shutdown
    logger.info(f"Shutting down {APP_NAME}")


# Create FastAPI application
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=APP_DESCRIPTION,
    lifespan=lifespan,
    docs_url="/api-docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Dashboard
        "http://localhost:3004",  # Legacy Express API (during migration)
        "http://localhost:8080",  # Alternative dashboard port
        "http://localhost:5173",  # Vite dev server
        "https://icodemybusiness.com",  # Production domain
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"]
)


# Middleware for request ID and logging
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Add unique request ID to each request."""
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    # Log request
    logger.info(f"[{request_id}] {request.method} {request.url.path}")

    # Process request
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    # Add headers
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(process_time)

    # Log response
    logger.info(f"[{request_id}] Status: {response.status_code} Time: {process_time:.3f}s")

    return response


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    uptime_seconds = time.time() - START_TIME

    return {
        "status": "healthy",
        "service": APP_NAME,
        "version": APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "uptime": uptime_seconds,
        "endpoints": {
            "clients": "/api/clients",
            "projects": "/api/projects",
            "deliverables": "/api/deliverables",
            "briefings": "/api/briefings",
            "communications": "/api/communications",
            "metrics": "/api/metrics"
        },
        "environment": os.getenv("ENVIRONMENT", "development"),
        "convex_connected": bool(os.getenv("CONVEX_URL"))
    }


# Include routers
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(projects.router, prefix="/api/projects", tags=["Projects"])
app.include_router(deliverables.router, prefix="/api/deliverables", tags=["Deliverables"])
app.include_router(briefings.router, prefix="/api/briefings", tags=["Briefings"])
app.include_router(communications.router, prefix="/api/communications", tags=["Communications"])
app.include_router(metrics.router, prefix="/api/metrics", tags=["Metrics"])


# Global exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.detail,
            "request_id": getattr(request.state, "request_id", None),
            "path": request.url.path
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    request_id = getattr(request.state, "request_id", None)
    logger.error(f"[{request_id}] Unhandled exception: {exc}", exc_info=True)

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "message": str(exc) if os.getenv("ENVIRONMENT") == "development" else "An error occurred",
            "request_id": request_id
        }
    )


# 404 handler
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def catch_all(request: Request, path: str):
    """Catch all undefined routes."""
    raise HTTPException(
        status_code=404,
        detail=f"Endpoint not found: {request.method} /{path}"
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 3004))
    host = os.getenv("HOST", "0.0.0.0")
    reload = os.getenv("ENVIRONMENT", "development") == "development"

    logger.info(f"""
    ╔════════════════════════════════════════════════════════╗
    ║                                                        ║
    ║     {APP_NAME} Started Successfully                   ║
    ║                                                        ║
    ║     Port: {port}                                      ║
    ║     Health: http://localhost:{port}/health            ║
    ║     Docs: http://localhost:{port}/api-docs            ║
    ║                                                        ║
    ╚════════════════════════════════════════════════════════╝
    """)

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="info"
    )