#!/bin/bash

# Run tests for integration services

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Running unit tests..."
pytest integrations -m unit -v

echo "Running integration tests with mocked APIs..."
pytest integrations -m "not slow" -v --cov=integrations

echo "Generating coverage report..."
pytest --cov=integrations --cov-report=html

echo "Tests completed! Coverage report available in htmlcov/index.html"