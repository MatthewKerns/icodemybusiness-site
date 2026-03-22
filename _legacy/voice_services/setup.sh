#!/bin/bash

# Voice Services Setup Script
# Installs required dependencies and validates configuration

echo "========================================="
echo "Voice Services Setup for iCodeMyBusiness"
echo "========================================="
echo ""

# Check Python version
echo "Checking Python version..."
python3 --version

# Create virtual environment (optional but recommended)
echo ""
echo "Setting up environment..."
echo "To create a virtual environment (recommended), run:"
echo "  python3 -m venv venv"
echo "  source venv/bin/activate"
echo ""

# Install dependencies
echo "Installing required packages..."
echo "Run: pip3 install -r voice_services/requirements.txt"
echo ""

# Environment variables
echo "Required environment variables:"
echo "  export VAPI_API_KEY='your-vapi-api-key'"
echo "  export CONVEX_URL='your-convex-deployment-url'"
echo "  export TRANSFER_PHONE_NUMBER='+14155555678'"  # Matthew's number
echo ""

# Configuration validation
echo "To validate configuration, run:"
echo "  python3 voice_services/test_runner.py"
echo ""

echo "========================================="
echo "Next Steps:"
echo "========================================="
echo "1. Install dependencies: pip3 install requests python-dotenv pytest pytest-mock"
echo "2. Set environment variables in .env file"
echo "3. Configure Vapi webhook URL in dashboard"
echo "4. Test with: python3 voice_services/test_runner.py"
echo "5. Deploy API endpoint for webhook handling"