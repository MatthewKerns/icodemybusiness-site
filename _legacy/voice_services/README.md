# Voice Services & AI Integration

## Overview

This module provides Vapi voice agent integration for iCodeMyBusiness, enabling AI-powered inbound sales calls with automatic lead qualification, sentiment analysis, and CRM integration.

## Features

### Voice Agent Platform (Vapi)
- **Sales Personality**: Configured as "Alex", professional sales discovery agent
- **Conversation Flow**: 5-phase structured sales conversation
- **Guardrails**: Built-in objection handling and conversation boundaries
- **Real-time Processing**: Live transcript analysis and decision making
- **Call Transfer**: Warm handoff to Matthew for complex technical questions

### AI Analysis
- **Sentiment Analysis**: Real-time emotional tone tracking
- **Lead Scoring**: BANT-based qualification with AI enhancement
- **Pain Point Extraction**: Automatic identification of business challenges
- **Engagement Metrics**: Customer interaction quality scoring
- **Competitor Analysis**: Track mentions and dissatisfaction signals

### Integration Points
- **Convex Database**: All calls logged with full analysis
- **Lead Management**: Automatic lead creation and scoring
- **Calendar Integration**: Discovery call scheduling
- **CRM Sync**: Real-time lead status updates

## Architecture

```
voice_services/
├── vapi/                      # Vapi platform integration
│   ├── agent_config.py        # Voice agent personality & flow
│   ├── call_handler.py        # Event processing & state management
│   └── transcript_processor.py # Conversation analysis
│
├── ai_analysis/               # AI-powered analysis
│   ├── sentiment.py           # Emotional tone & engagement
│   └── lead_scoring.py        # BANT scoring & qualification
│
└── tests/                     # Comprehensive test coverage
    ├── test_vapi.py          # Voice flow testing
    └── test_analysis.py      # AI logic validation
```

## Installation

```bash
# Install dependencies
pip install -r voice_services/requirements.txt

# Set environment variables
export VAPI_API_KEY="your-vapi-key"
export CONVEX_URL="your-convex-deployment"
```

## Configuration

### 1. Voice Agent Setup

```python
from voice_services import VapiAgentConfig

# Create agent configuration
config = VapiAgentConfig()
agent = config.create_agent()

# Export for Vapi dashboard
config.export_config("vapi_config.json")
```

### 2. Call Event Processing

```python
from voice_services import CallEventHandler, CallEvent

# Initialize handler
handler = CallEventHandler(api_key="your-vapi-key")

# Process incoming call event
event = CallEvent(
    type="call-start",
    call_id="call_123",
    direction="inbound",
    from_number="+14155551234"
)

result = handler.handle_event(event)
```

### 3. Transcript Analysis

```python
from voice_services import TranscriptProcessor

processor = TranscriptProcessor()
analysis = processor.analyze_transcript(transcript)

print(f"Pain points: {analysis.pain_points}")
print(f"Sentiment: {analysis.sentiment}")
print(f"Booking intent: {analysis.intent_to_book}")
```

### 4. Lead Scoring

```python
from voice_services import LeadScoringEngine, QualificationFactors

engine = LeadScoringEngine()

factors = QualificationFactors(
    pain_points=["manual lead tracking", "losing customers"],
    team_size="10-20",
    timeline="this month",
    sentiment="positive",
    booking_intent=True
)

score = engine.calculate_score(factors)
print(f"Lead score: {score.total}")
print(f"Category: {score.category}")  # hot, warm, cold
print(f"Recommendation: {score.recommendation}")
```

## Voice Agent Conversation Flow

### Phase 1: Greeting (30-60 seconds)
```
"Hey [Name], thanks for reaching out! I'm Alex with iCodeMyBusiness.
We help small business owners turn their biggest operational headaches
into automated systems. I'd love to hear about what's eating up your time right now."
```

### Phase 2: Pain Discovery (2-4 minutes)
- What does a typical day look like?
- What tasks do you wish could disappear?
- How are you currently handling [pain point]?
- How much time does that cost you per week?

### Phase 3: Value Bridge (1-2 minutes)
- Connect specific pain to custom solution
- Explain difference from templates/no-code
- Reference the discovery-to-delivery pipeline

### Phase 4: Qualification (1 minute)
- Team size assessment
- Previous solution attempts
- Timeline understanding

### Phase 5: Booking (1 minute)
- Position discovery call as next step
- Offer specific availability
- Confirm scheduling details

## Guardrails & Objection Handling

The system includes pre-configured responses for common scenarios:

- **Pricing Questions**: Defer to discovery call for custom quote
- **Technical Questions**: Offer transfer to Matthew
- **Competitor Comparisons**: Focus on custom-coded difference
- **Time Wasters**: Redirect to business value
- **Not Interested**: Graceful exit with LinkedIn connection

## Testing

```bash
# Run all tests
pytest voice_services/

# Run with coverage
pytest voice_services/ --cov=voice_services --cov-report=html

# Run specific test suite
pytest voice_services/vapi/tests/test_vapi.py -v
```

## Key Test Coverage

- ✅ Voice agent configuration validation
- ✅ Call event handling (start, end, transfer, failure)
- ✅ Transcript analysis and pain point extraction
- ✅ Sentiment analysis with confidence scoring
- ✅ Lead scoring with BANT criteria
- ✅ Real-time transfer decision logic
- ✅ Conversation quality metrics
- ✅ Coaching recommendations generation

## Production Deployment

### Environment Variables
```bash
VAPI_API_KEY=vapi_xxxxxx
CONVEX_URL=https://your-app.convex.cloud
CONVEX_DEPLOY_URL=https://your-app.convex.site
TRANSFER_PHONE_NUMBER=+14155555678  # Matthew's number
```

### Webhook Configuration

Configure Vapi to send events to:
```
https://your-domain.com/api/voice/webhook
```

### Call Recording

All calls are recorded in dual-channel format for:
- Quality assurance
- Training data collection
- Compliance requirements
- Coaching opportunities

## Monitoring & Analytics

### Key Metrics Tracked
- Call duration and completion rate
- Lead score distribution
- Sentiment progression
- Booking conversion rate
- Transfer frequency and reasons
- Objection patterns
- Pain point categories

### Dashboard Integration

The Convex database stores all metrics for real-time dashboard display:
- Active calls counter
- Daily lead score average
- Sentiment trending
- Conversion funnel metrics

## Compliance & Security

- **GDPR Compliant**: Consent recorded, data retention policies
- **Call Recording Notice**: Automatic announcement at start
- **PII Handling**: Encrypted storage, access controls
- **SOC 2 Alignment**: Audit logging, secure transmission

## Future Enhancements

- [ ] Multi-language support
- [ ] Voice cloning for consistency
- [ ] Outbound campaign automation
- [ ] SMS follow-up sequences
- [ ] A/B testing conversation flows
- [ ] Advanced coaching AI
- [ ] Predictive lead scoring ML model
- [ ] Real-time supervisor monitoring

## Support

For issues or questions:
- Technical: Review test files for implementation examples
- Configuration: Check agent_config.py for customization
- Integration: See call_handler.py for event processing