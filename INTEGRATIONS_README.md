# External Integration Services

## Overview
This module provides webhook handlers and API adapters for integrating external services with the iCodeMyBusiness platform. All integrations follow TDD principles with comprehensive test coverage.

## Architecture

```
integrations/
├── calendly/         # Calendly webhook handler for automatic lead creation
├── unipile/          # Multi-channel messaging (email, LinkedIn, WhatsApp)
├── claude/           # Claude Vision API for OCR and content generation
├── stripe/           # Payment processing and billing
└── server.py         # FastAPI server with all endpoints
```

## Features

### 1. Calendly Integration (Lead Score: 70+)
- Automatic lead creation from bookings
- High lead scoring (70+ base score)
- Meeting scheduling in Convex
- Cancellation handling
- Signature verification

**Endpoints:**
- `POST /webhooks/calendly` - Webhook receiver

### 2. Unipile Multi-Channel Messaging
- Email synchronization
- LinkedIn message processing
- WhatsApp integration
- Unified inbox aggregation
- Auto-reply templates

**Endpoints:**
- `POST /api/unipile/sync-inbox` - Sync email inbox
- `POST /api/unipile/process-message` - Process messages
- `GET /api/unipile/unified-inbox` - Get all messages

### 3. Claude Vision OCR
- Business card scanning
- Contact extraction with high confidence scoring
- Automatic lead creation from cards
- Multiple card processing
- Document text extraction

**Endpoints:**
- `POST /api/ocr/business-card` - Single card OCR
- `POST /api/ocr/multiple-cards` - Multiple cards OCR

### 4. Claude Content Generation
- Personalized email templates
- LinkedIn message generation
- Proposal outlines
- Batch content generation
- Tone/style adaptation

**Endpoints:**
- `POST /api/content/generate` - Generate content
- `POST /api/content/batch-generate` - Batch generation

### 5. Stripe Billing
- Customer creation from leads
- Subscription management
- Payment link generation
- Webhook processing
- MRR calculation

**Endpoints:**
- `POST /webhooks/stripe` - Webhook receiver
- `POST /api/stripe/create-customer` - Create customer
- `POST /api/stripe/create-payment-link` - Payment links

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment
Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

### 3. Run Tests
```bash
# Run all tests
./run_tests.sh

# Run specific integration tests
pytest integrations/calendly/tests -v
pytest integrations/unipile/tests -v
pytest integrations/claude/tests -v
pytest integrations/stripe/tests -v
```

### 4. Start Server
```bash
# Development mode
uvicorn integrations.server:app --reload --port 8000

# Production mode
uvicorn integrations.server:app --host 0.0.0.0 --port 8000 --workers 4
```

### 5. Docker Deployment
```bash
# Build and run with Docker Compose
docker-compose -f docker-compose.integrations.yml up -d

# View logs
docker-compose -f docker-compose.integrations.yml logs -f
```

## API Documentation

Once the server is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Lead Scoring System

| Source | Base Score | Boost Conditions |
|--------|------------|-----------------|
| Calendly | 70 | +15 for Enterprise, +10 for Demo |
| Email | 50 | +10 for high-intent keywords |
| LinkedIn | 60 | +10 for decision-maker titles |
| WhatsApp | 55 | +5 for immediate response |
| Referral | 80 | +20 for warm introduction |
| Business Card | 40 | +30 with complete contact info |

## Webhook Security

All webhooks implement signature verification:
- Calendly: HMAC-SHA256 signature
- Stripe: Stripe signature verification
- Unipile: Custom webhook secret

## Testing Strategy

### Unit Tests
- Mock external APIs
- Test data validation
- Error handling
- Score calculations

### Integration Tests
- Webhook processing
- Lead creation flow
- Message synchronization
- Payment workflows

### Test Coverage
Target: 80%+ coverage for all modules

```bash
# Generate coverage report
pytest --cov=integrations --cov-report=html
# View report at htmlcov/index.html
```

## Environment Variables

### Required
- `CONVEX_DEPLOYMENT_URL` - Convex backend URL
- `CONVEX_API_KEY` - Convex API authentication
- `CALENDLY_WEBHOOK_TOKEN` - Calendly webhook secret
- `ANTHROPIC_API_KEY` - Claude API key
- `STRIPE_API_KEY` - Stripe secret key

### Optional
- `UNIPILE_API_KEY` - Unipile authentication
- `ENVIRONMENT` - development/production
- `API_PORT` - Server port (default: 8000)

## Error Handling

All integrations implement:
- Retry logic with exponential backoff
- Graceful degradation
- Comprehensive logging
- Activity tracking in Convex

## Monitoring

### Health Check
```bash
curl http://localhost:8000/health
```

### Logs
- Application logs: `integrations/*.log`
- Access logs: FastAPI automatic logging
- Error tracking: Structured logging with levels

## Content Demonstrability

Each integration can be demonstrated:
1. **Calendly**: Book a test meeting → Lead appears in dashboard
2. **Unipile**: Send test email → Appears in unified inbox
3. **Claude OCR**: Upload business card → Contact extracted
4. **Content Gen**: Generate email → Review personalization
5. **Stripe**: Create payment link → Process test payment

## Production Checklist

- [ ] Set `ENVIRONMENT=production`
- [ ] Configure webhook URLs in external services
- [ ] Enable signature verification
- [ ] Set up SSL/TLS certificates
- [ ] Configure rate limiting
- [ ] Set up monitoring/alerting
- [ ] Backup webhook payloads
- [ ] Test error recovery

## Support

For issues or questions:
1. Check test files for usage examples
2. Review API documentation at `/docs`
3. Check logs for error details
4. Verify webhook signatures
5. Test with mock data first