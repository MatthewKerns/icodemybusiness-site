"""Main application entry point for the portal backend."""
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import logging

from config import settings
from api import auth, projects, requests, documents
from websocket.notifications import websocket_endpoint, manager
from websocket.updates import update_stream


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting portal backend...")
    manager.start_processing()
    logger.info("Notification processing started")

    yield

    # Shutdown
    logger.info("Shutting down portal backend...")
    manager.stop_processing()
    # Stop all active streams
    for project_id in list(update_stream.active_streams.keys()):
        await update_stream.stop_metrics_stream(project_id)
    logger.info("Cleanup completed")


# Create FastAPI application
app = FastAPI(
    title="ICodeMyBusiness Client Portal API",
    description="Backend API for client portal with real-time updates",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(requests.router, prefix="/api")
app.include_router(documents.router, prefix="/api")

# WebSocket endpoint
app.add_api_websocket_route("/ws", websocket_endpoint)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "ICodeMyBusiness Client Portal API",
        "version": "1.0.0",
        "status": "operational",
        "documentation": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "portal-backend",
        "connections": manager.get_connection_stats(),
        "streams": update_stream.get_stream_status()
    }


@app.get("/api/status")
async def api_status():
    """API status and statistics."""
    return {
        "api_version": "1.0.0",
        "authentication": "Clerk",
        "realtime": "WebSocket",
        "database": "Convex",
        "active_connections": manager.get_connection_stats()["total_connections"],
        "active_users": manager.get_connection_stats()["total_users"],
        "active_streams": update_stream.get_stream_status()["stream_count"]
    }


@app.exception_handler(404)
async def not_found_handler(request, exc):
    """Custom 404 handler."""
    return JSONResponse(
        status_code=404,
        content={"detail": "Resource not found"}
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    """Custom 500 handler."""
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


# Development endpoints (remove in production)
if settings.api_host == "0.0.0.0":
    @app.post("/api/test/start-stream/{project_id}")
    async def test_start_stream(project_id: str):
        """Test endpoint to start metrics stream."""
        await update_stream.start_metrics_stream(project_id, interval=10)
        return {"message": f"Started stream for project {project_id}"}

    @app.post("/api/test/stop-stream/{project_id}")
    async def test_stop_stream(project_id: str):
        """Test endpoint to stop metrics stream."""
        await update_stream.stop_metrics_stream(project_id)
        return {"message": f"Stopped stream for project {project_id}"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
        log_level="info"
    )