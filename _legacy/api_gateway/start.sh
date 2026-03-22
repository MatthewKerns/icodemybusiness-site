#!/bin/bash

# ICMB FastAPI Gateway Startup Script

echo "Starting ICMB FastAPI Gateway..."

# Change to script directory
cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Set environment variables (optional)
export ENVIRONMENT=${ENVIRONMENT:-development}
export PORT=${PORT:-3004}

# Start the FastAPI server
if [ "$1" = "dev" ]; then
    echo "Starting in development mode with auto-reload..."
    uvicorn main:app --reload --host 0.0.0.0 --port $PORT
else
    echo "Starting in production mode..."
    uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4
fi