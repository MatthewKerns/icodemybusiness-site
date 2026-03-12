"""
Claude Vision API integration for business card OCR
"""

import re
import base64
import logging
from typing import Dict, Any, List, Optional
import anthropic

from ..convex_client import convex
from ..config import config

logger = logging.getLogger(__name__)


class ClaudeVisionOCR:
    """OCR service using Claude Vision API"""

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=config.anthropic_api_key)
        self.model = config.claude_model
        self.convex = convex

    async def extract_business_card(
        self,
        image_data: str,
        image_format: str = "image/jpeg"
    ) -> Dict[str, Any]:
        """
        Extract contact information from business card image

        Args:
            image_data: Base64 encoded image data
            image_format: MIME type of image

        Returns:
            Extracted contact information
        """
        prompt = """
        Please extract all contact information from this business card image.
        Return the data in this exact JSON format:
        {
            "name": "Full name",
            "title": "Job title",
            "company": "Company name",
            "email": "Email address",
            "phone": "Phone number",
            "address": "Full address",
            "website": "Website URL",
            "linkedin": "LinkedIn profile",
            "confidence": 0.95
        }

        If any field is not visible or unclear, use null for that field.
        Include a confidence score between 0 and 1.
        """

        response = await self._call_claude_api(image_data, prompt, image_format)
        return self._parse_card_response(response)

    async def _call_claude_api(
        self,
        image_data: str,
        prompt: str,
        image_format: str
    ) -> Dict[str, Any]:
        """Call Claude Vision API"""
        try:
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": image_format,
                                    "data": image_data
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            )

            # Parse JSON response
            import json
            response_text = message.content[0].text

            # Extract JSON from response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())

            return {"error": "Could not parse response"}

        except Exception as e:
            logger.error(f"Claude API error: {e}")
            return {"error": str(e)}

    def _parse_card_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse and validate business card extraction response"""
        if "error" in response:
            return response

        # Clean and validate extracted data
        cleaned = {}

        for field in ["name", "title", "company", "email", "phone", "address", "website", "linkedin"]:
            value = response.get(field)
            if value and value != "null":
                cleaned[field] = value.strip()

        # Validate email format
        if "email" in cleaned:
            if not self._is_valid_email(cleaned["email"]):
                logger.warning(f"Invalid email format: {cleaned['email']}")
                cleaned["email_invalid"] = True

        # Clean phone number
        if "phone" in cleaned:
            cleaned["phone"] = self._clean_phone_number(cleaned["phone"])

        cleaned["confidence"] = response.get("confidence", 0.8)

        return cleaned

    def _is_valid_email(self, email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    def _clean_phone_number(self, phone: str) -> str:
        """Clean and format phone number"""
        # Remove all non-numeric except + and -
        cleaned = re.sub(r'[^\d+\-\s]', '', phone)
        return cleaned.strip()

    def _validate_contact_data(self, data: Dict[str, Any]) -> bool:
        """Validate extracted contact data"""
        # Must have at least name and one contact method
        has_name = bool(data.get("name"))
        has_contact = any([
            data.get("email") and self._is_valid_email(data["email"]),
            data.get("phone"),
            data.get("linkedin")
        ])

        return has_name and has_contact

    def _is_high_confidence(self, data: Dict[str, Any]) -> bool:
        """Check if extraction has high confidence"""
        return data.get("confidence", 0) >= 0.7

    async def extract_multiple_cards(
        self,
        image_data: str,
        image_format: str = "image/jpeg"
    ) -> List[Dict[str, Any]]:
        """
        Extract data from multiple business cards in one image

        Args:
            image_data: Base64 encoded image data
            image_format: MIME type of image

        Returns:
            List of extracted contact information
        """
        prompt = """
        This image may contain multiple business cards.
        Extract contact information from ALL visible business cards.
        Return the data as a JSON object with a "cards" array:
        {
            "cards": [
                {
                    "name": "Full name",
                    "title": "Job title",
                    "company": "Company name",
                    "email": "Email address",
                    "phone": "Phone number",
                    "confidence": 0.95
                }
            ]
        }
        """

        response = await self._call_claude_api(image_data, prompt, image_format)

        if "error" in response:
            return []

        cards = response.get("cards", [])
        return [self._parse_card_response(card) for card in cards]

    async def scan_and_create_lead(
        self,
        image_data: str,
        source: str = "business_card",
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Scan business card and automatically create lead

        Args:
            image_data: Base64 encoded image data
            source: Lead source identifier
            notes: Additional notes about the lead

        Returns:
            Result with lead ID and extracted data
        """
        # Extract business card data
        card_data = await self.extract_business_card(image_data)

        if "error" in card_data:
            return {
                "success": False,
                "error": card_data["error"]
            }

        if not self._validate_contact_data(card_data):
            return {
                "success": False,
                "error": "Invalid or incomplete contact data"
            }

        # Create lead in Convex
        lead_result = await self.convex.create_lead(
            name=card_data.get("name"),
            email=card_data.get("email"),
            phone=card_data.get("phone"),
            company=card_data.get("company"),
            source=source,
            notes=notes or f"Title: {card_data.get('title', 'N/A')}\nExtracted via OCR",
            metadata={
                "ocr_confidence": card_data.get("confidence"),
                "linkedin": card_data.get("linkedin"),
                "website": card_data.get("website")
            }
        )

        return {
            "success": True,
            "lead_id": lead_result.get("leadId"),
            "extracted_data": card_data
        }

    async def extract_text_from_document(
        self,
        image_data: str,
        document_type: str = "general"
    ) -> Dict[str, Any]:
        """
        Extract text from documents (invoices, contracts, etc.)

        Args:
            image_data: Base64 encoded image data
            document_type: Type of document

        Returns:
            Extracted text and metadata
        """
        prompts = {
            "invoice": "Extract invoice number, date, amount, and line items",
            "contract": "Extract party names, dates, terms, and key clauses",
            "general": "Extract all readable text maintaining structure"
        }

        prompt = prompts.get(document_type, prompts["general"])

        response = await self._call_claude_api(
            image_data,
            prompt,
            "image/jpeg"
        )

        return {
            "document_type": document_type,
            "extracted_content": response
        }