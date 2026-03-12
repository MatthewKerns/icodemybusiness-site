#!/bin/bash

# ICMB FastAPI Gateway Test Runner

echo "Running ICMB FastAPI Gateway Tests..."

# Change to script directory
cd "$(dirname "$0")"

# Activate virtual environment
source venv/bin/activate

# Run tests based on argument
case "$1" in
    unit)
        echo "Running unit tests only..."
        pytest -m unit -v
        ;;
    integration)
        echo "Running integration tests only..."
        pytest -m integration -v
        ;;
    coverage)
        echo "Running all tests with coverage..."
        pytest --cov=. --cov-report=term-missing --cov-report=html
        echo "Coverage report saved to htmlcov/index.html"
        ;;
    watch)
        echo "Running tests in watch mode..."
        pip install pytest-watch
        ptw
        ;;
    *)
        echo "Running all tests..."
        pytest -v
        ;;
esac