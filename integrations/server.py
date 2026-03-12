"""
FastAPI server for handling webhook endpoints and integration APIs
"""

import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Header, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

from .config import config
from .calendly import CalendlyWebhookHandler, verify_webhook_signature as verify_calendly
from .unipile import UnipileEmailSync, UnipileMessageProcessor
from .claude import ClaudeVisionOCR, ClaudeContentGenerator
from .stripe import StripeBillingHandler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="iCodeMyBusiness Integration Services",
    version="1.0.0",
    description="Webhook handlers and API endpoints for external integrations"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your needs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize handlers
calendly_handler = CalendlyWebhookHandler()
unipile_sync = UnipileEmailSync()
unipile_processor = UnipileMessageProcessor()
vision_ocr = ClaudeVisionOCR()
content_generator = ClaudeContentGenerator()
stripe_handler = StripeBillingHandler()


# Request/Response models
class CalendlyWebhookRequest(BaseModel):
    event: str
    payload: dict


class UnipileMessageRequest(BaseModel):
    channel: str
    from_data: dict
    content: str
    metadata: Optional[dict] = {}


class OCRRequest(BaseModel):
    image_data: str
    image_format: str = "image/jpeg"
    create_lead: bool = True
    source: str = "business_card"


class ContentGenerationRequest(BaseModel):
    lead_data: dict
    content_type: str = "email"
    template: str = "cold_outreach"


class StripeWebhookRequest(BaseModel):
    type: str
    data: dict


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "integration-services",
        "version": "1.0.0"
    }


# Calendly webhook endpoints
@app.post("/webhooks/calendly")
async def handle_calendly_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_calendly_signature: Optional[str] = Header(None)
):
    """Handle Calendly webhook events"""
    try:
        # Get raw body for signature verification
        body = await request.body()
        body_str = body.decode()

        # Verify signature
        if config.environment == "production":
            if not x_calendly_signature or not verify_calendly(
                body_str,
                x_calendly_signature,
                config.calendly_webhook_token
            ):
                raise HTTPException(status_code=401, detail="Invalid signature")

        # Parse request
        data = await request.json()

        # Process in background
        background_tasks.add_task(
            calendly_handler.handle_event,
            data
        )

        return {"status": "accepted"}

    except Exception as e:
        logger.error(f"Calendly webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


# Unipile endpoints
@app.post("/api/unipile/sync-inbox")
async def sync_unipile_inbox(
    since_hours: int = 24,
    background_tasks: BackgroundTasks = None
):
    """Sync email inbox via Unipile"""
    try:
        if background_tasks:
            background_tasks.add_task(
                unipile_sync.sync_inbox,
                since_hours
            )
            return {"status": "syncing", "message": "Inbox sync started"}
        else:
            results = await unipile_sync.sync_inbox(since_hours)
            return {
                "status": "completed",
                "emails_processed": len(results),
                "leads_created": sum(1 for r in results if r.get("action") == "lead_created")
            }

    except Exception as e:
        logger.error(f"Unipile sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/unipile/process-message")
async def process_unipile_message(
    message: UnipileMessageRequest
):
    """Process message from any channel via Unipile"""
    try:
        message_data = {
            "channel": message.channel,
            "from": message.from_data,
            "content": message.content,
            **message.metadata
        }

        result = await unipile_processor.process_message(message_data)
        return result

    except Exception as e:
        logger.error(f"Message processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/unipile/unified-inbox")
async def get_unified_inbox(
    since_hours: int = 24,
    channels: Optional[str] = None
):
    """Get unified inbox from all channels"""
    try:
        channel_list = channels.split(",") if channels else None
        messages = await unipile_processor.get_unified_inbox(
            since_hours,
            channel_list
        )

        return {
            "total_messages": len(messages),
            "messages": messages
        }

    except Exception as e:
        logger.error(f"Unified inbox error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Claude Vision OCR endpoints
@app.post("/api/ocr/business-card")
async def scan_business_card(
    request: OCRRequest
):
    """Extract contact info from business card image"""
    try:
        if request.create_lead:
            result = await vision_ocr.scan_and_create_lead(
                image_data=request.image_data,
                source=request.source
            )
        else:
            result = await vision_ocr.extract_business_card(
                image_data=request.image_data,
                image_format=request.image_format
            )

        return result

    except Exception as e:
        logger.error(f"OCR error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ocr/multiple-cards")
async def scan_multiple_cards(
    request: OCRRequest
):
    """Extract data from multiple business cards"""
    try:
        results = await vision_ocr.extract_multiple_cards(
            image_data=request.image_data,
            image_format=request.image_format
        )

        return {
            "cards_found": len(results),
            "extracted_data": results
        }

    except Exception as e:
        logger.error(f"Multiple card OCR error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Content generation endpoints
@app.post("/api/content/generate")
async def generate_content(
    request: ContentGenerationRequest
):
    """Generate marketing content using Claude"""
    try:
        if request.content_type == "email":
            content = await content_generator.generate_email(
                lead_data=request.lead_data,
                template_type=request.template
            )
        elif request.content_type == "linkedin":
            content = await content_generator.generate_linkedin_message(
                context=request.lead_data
            )
        elif request.content_type == "proposal":
            content = await content_generator.generate_proposal_outline(
                project_details=request.lead_data
            )
        else:
            raise ValueError(f"Unknown content type: {request.content_type}")

        return {
            "content_type": request.content_type,
            "template": request.template,
            "generated_content": content
        }

    except Exception as e:
        logger.error(f"Content generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/content/batch-generate")
async def batch_generate_content(
    leads: list,
    content_type: str = "email",
    template: str = "cold_outreach"
):
    """Generate content for multiple leads"""
    try:
        if content_type == "email":
            results = await content_generator.batch_generate_emails(
                leads=leads,
                template_type=template
            )
        else:
            raise ValueError(f"Batch generation not supported for: {content_type}")

        return {
            "total_generated": len(results),
            "results": results
        }

    except Exception as e:
        logger.error(f"Batch generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Stripe webhook endpoints
@app.post("/webhooks/stripe")
async def handle_stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None)
):
    """Handle Stripe webhook events"""
    try:
        # Get raw body for signature verification
        body = await request.body()
        body_str = body.decode()

        # Verify signature
        if config.environment == "production":
            if not stripe_signature or not stripe_handler.verify_webhook_signature(
                body_str,
                stripe_signature
            ):
                raise HTTPException(status_code=401, detail="Invalid signature")

        # Parse request
        data = await request.json()

        # Process webhook
        result = await stripe_handler.handle_webhook_event(data)
        return result

    except Exception as e:
        logger.error(f"Stripe webhook error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/stripe/create-customer")
async def create_stripe_customer(lead_data: dict):
    """Create Stripe customer from lead"""
    try:
        result = await stripe_handler.create_customer(lead_data)
        return result

    except Exception as e:
        logger.error(f"Customer creation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/stripe/create-payment-link")
async def create_payment_link(
    price_id: str,
    lead_id: str,
    success_url: Optional[str] = None,
    cancel_url: Optional[str] = None
):
    """Create payment link for lead"""
    try:
        result = await stripe_handler.create_payment_link(
            price_id=price_id,
            lead_id=lead_id,
            success_url=success_url or "https://example.com/success",
            cancel_url=cancel_url or "https://example.com/cancel"
        )
        return result

    except Exception as e:
        logger.error(f"Payment link error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Main entry point
if __name__ == "__main__":
    uvicorn.run(
        "server:app",
        host=config.api_host,
        port=config.api_port,
        reload=config.environment == "development"
    )