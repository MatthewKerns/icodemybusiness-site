"""
Tests for Claude Vision API integration
"""

import pytest
import base64
from unittest.mock import AsyncMock, patch, MagicMock

from ..vision_ocr import ClaudeVisionOCR
from ..content_generator import ClaudeContentGenerator


@pytest.mark.asyncio
class TestClaudeVisionOCR:
    """Test Claude Vision API for business card OCR"""

    async def test_extract_business_card_data(self):
        """Test extracting contact info from business card image"""
        ocr = ClaudeVisionOCR()

        # Mock base64 encoded image
        mock_image = base64.b64encode(b"mock_image_data").decode()

        # Mock Claude API response
        mock_response = {
            "name": "John Smith",
            "title": "CEO",
            "company": "Tech Innovations Inc.",
            "email": "john.smith@techinnovations.com",
            "phone": "+1 (555) 123-4567",
            "address": "123 Tech Street, San Francisco, CA 94105",
            "website": "www.techinnovations.com",
            "linkedin": "linkedin.com/in/johnsmith"
        }

        with patch.object(ocr, '_call_claude_api', return_value=mock_response):
            result = await ocr.extract_business_card(mock_image)

            assert result["name"] == "John Smith"
            assert result["company"] == "Tech Innovations Inc."
            assert result["email"] == "john.smith@techinnovations.com"
            assert result["phone"] == "+1 (555) 123-4567"

    async def test_validate_extracted_email(self):
        """Test email validation in extracted data"""
        ocr = ClaudeVisionOCR()

        valid_data = {
            "name": "Jane Doe",
            "email": "jane@example.com"
        }

        invalid_data = {
            "name": "John Doe",
            "email": "invalid-email"
        }

        assert ocr._validate_contact_data(valid_data) == True
        assert ocr._validate_contact_data(invalid_data) == False

    async def test_handle_multiple_cards(self):
        """Test processing multiple business cards in one image"""
        ocr = ClaudeVisionOCR()

        mock_image = base64.b64encode(b"mock_multi_card_image").decode()

        mock_response = {
            "cards": [
                {
                    "name": "Person One",
                    "email": "person1@example.com",
                    "company": "Company A"
                },
                {
                    "name": "Person Two",
                    "email": "person2@example.com",
                    "company": "Company B"
                }
            ]
        }

        with patch.object(ocr, '_call_claude_api', return_value=mock_response):
            results = await ocr.extract_multiple_cards(mock_image)

            assert len(results) == 2
            assert results[0]["name"] == "Person One"
            assert results[1]["name"] == "Person Two"

    async def test_ocr_with_lead_creation(self):
        """Test OCR with automatic lead creation"""
        ocr = ClaudeVisionOCR()

        mock_card_data = {
            "name": "Sarah Johnson",
            "title": "VP of Sales",
            "company": "Enterprise Solutions Ltd",
            "email": "sarah@enterprise.com",
            "phone": "+1-555-9876"
        }

        with patch.object(ocr, 'extract_business_card', return_value=mock_card_data):
            with patch('integrations.convex_client.convex.create_lead') as mock_create:
                mock_create.return_value = {"leadId": "lead_ocr_123"}

                result = await ocr.scan_and_create_lead(
                    image_data="mock_image",
                    source="networking_event"
                )

                assert result["lead_id"] == "lead_ocr_123"
                assert result["extracted_data"]["name"] == "Sarah Johnson"

                # Verify lead was created with correct data
                call_args = mock_create.call_args[1]
                assert call_args["name"] == "Sarah Johnson"
                assert call_args["company"] == "Enterprise Solutions Ltd"
                assert call_args["source"] == "networking_event"

    async def test_confidence_scoring(self):
        """Test OCR confidence scoring"""
        ocr = ClaudeVisionOCR()

        high_confidence_data = {
            "name": "Clear Name",
            "email": "clear@email.com",
            "phone": "+1-555-1234",
            "company": "Clear Company",
            "confidence": 0.95
        }

        low_confidence_data = {
            "name": "Unclear",
            "email": "maybe@test",
            "confidence": 0.45
        }

        assert ocr._is_high_confidence(high_confidence_data) == True
        assert ocr._is_high_confidence(low_confidence_data) == False


@pytest.mark.asyncio
class TestClaudeContentGenerator:
    """Test Claude content generation for marketing"""

    async def test_generate_email_template(self):
        """Test generating personalized email templates"""
        generator = ClaudeContentGenerator()

        lead_data = {
            "name": "Michael Brown",
            "company": "Growth Startup Inc",
            "industry": "SaaS",
            "pain_points": ["scaling", "automation"]
        }

        with patch.object(generator, '_generate_with_claude') as mock_generate:
            mock_generate.return_value = "Dear Michael, ... [personalized content]"

            email = await generator.generate_email(
                lead_data=lead_data,
                template_type="cold_outreach"
            )

            assert "Michael" in email
            assert len(email) > 100

    async def test_generate_linkedin_message(self):
        """Test generating LinkedIn messages"""
        generator = ClaudeContentGenerator()

        context = {
            "profile_url": "linkedin.com/in/testuser",
            "mutual_connections": 5,
            "recent_post": "Just closed a major deal!"
        }

        with patch.object(generator, '_generate_with_claude') as mock_generate:
            mock_generate.return_value = "Hi! I saw your recent post about..."

            message = await generator.generate_linkedin_message(context)

            assert len(message) < 300  # LinkedIn has character limits
            assert "recent post" in message.lower()

    async def test_generate_proposal_outline(self):
        """Test generating proposal outlines"""
        generator = ClaudeContentGenerator()

        project_details = {
            "client": "Enterprise Corp",
            "project_type": "Digital Transformation",
            "budget_range": "$100k-$250k",
            "timeline": "6 months",
            "requirements": ["Cloud migration", "Process automation", "Training"]
        }

        with patch.object(generator, '_generate_with_claude') as mock_generate:
            mock_generate.return_value = {
                "executive_summary": "...",
                "scope": ["Cloud migration", "Automation"],
                "timeline": "6 months in 3 phases",
                "investment": "$175,000"
            }

            proposal = await generator.generate_proposal_outline(project_details)

            assert "executive_summary" in proposal
            assert "scope" in proposal
            assert len(proposal["scope"]) > 0

    async def test_content_personalization(self):
        """Test content personalization based on lead data"""
        generator = ClaudeContentGenerator()

        startup_lead = {
            "company_size": "10-50",
            "industry": "Tech Startup",
            "stage": "Series A"
        }

        enterprise_lead = {
            "company_size": "5000+",
            "industry": "Financial Services",
            "stage": "Public"
        }

        startup_content = generator._get_tone_and_style(startup_lead)
        enterprise_content = generator._get_tone_and_style(enterprise_lead)

        assert startup_content["tone"] == "casual-professional"
        assert enterprise_content["tone"] == "formal-professional"

    async def test_batch_content_generation(self):
        """Test generating content for multiple leads"""
        generator = ClaudeContentGenerator()

        leads = [
            {"name": "Lead 1", "company": "Company A"},
            {"name": "Lead 2", "company": "Company B"},
            {"name": "Lead 3", "company": "Company C"}
        ]

        with patch.object(generator, '_generate_with_claude') as mock_generate:
            mock_generate.side_effect = [
                f"Email for {lead['name']}" for lead in leads
            ]

            results = await generator.batch_generate_emails(leads)

            assert len(results) == 3
            assert "Lead 1" in results[0]["content"]
            assert "Lead 2" in results[1]["content"]