# iCodeMyBusiness Planning Documentation

This directory contains all strategic planning, architecture, and design documentation for the iCodeMyBusiness platform. Documents are organized by category for easy navigation.

## 📁 Directory Structure

```
planning/
├── architecture/        # System design and technical architecture
├── strategy/           # Business strategy and feature tracking
└── voice-agent/        # Voice agent platform design and prompts
```

## 📚 Document Index

### Architecture Documents

#### [data-integration.md](./architecture/data-integration.md)
**Three-Pillar System Architecture** - Comprehensive system design covering the external site, client portal, and internal operations dashboard. Details the flow from lead generation through discovery to implementation, including technical stack (Convex, Neon, FastAPI) and integration points.
- Last Updated: March 2024

#### [implementation-guide.md](./architecture/implementation-guide.md)
**Technical Setup & Deployment Guide** - Step-by-step implementation instructions for setting up the iCodeMyBusiness platform. Covers environment setup, database configuration, API deployment, and production deployment procedures.
- Last Updated: March 2024

### Strategy Documents

#### [content-amplification.md](./strategy/content-amplification.md)
**Build-in-Public Marketing Strategy** - Content creation and amplification strategy across multiple channels (X, TikTok, YouTube, Instagram). Defines the methodology for transforming feature builds into educational content that drives discovery calls.
- Last Updated: March 2024

#### [feature-tracker.md](./strategy/feature-tracker.md)
**Feature Build & Amplification Tracker** - Matrix tracking the status of all platform features across three dimensions: Built, Documented, and Amplified. Monitors which features have been converted into content and tracks their impact on call bookings.
- Last Updated: March 2024

### Voice Agent Documents

#### [sales-prompt.md](./voice-agent/sales-prompt.md)
**Voice Agent Sales Conversation Design** - Detailed prompt engineering for the voice-based sales agent. Includes conversation flows, objection handling scripts, and integration with the business management system for lead qualification and appointment booking.
- Last Updated: March 2024

#### [platform-design.md](./voice-agent/platform-design.md)
**Voice Platform Evaluation & Architecture** - Comprehensive review of voice agent platforms (OpenAI Realtime, ElevenLabs, Vapi). Analyzes capabilities, pricing, and integration requirements for implementing conversational AI in the sales funnel.
- Last Updated: March 2024

## 🚀 Quick Links

- **Starting a new feature?** → Check [feature-tracker.md](./strategy/feature-tracker.md) for priority items
- **Building backend services?** → Review [data-integration.md](./architecture/data-integration.md)
- **Setting up development?** → Follow [implementation-guide.md](./architecture/implementation-guide.md)
- **Creating content?** → Use [content-amplification.md](./strategy/content-amplification.md)
- **Implementing voice agent?** → Start with [platform-design.md](./voice-agent/platform-design.md)

## 📝 Contributing

When updating planning documents:
1. Keep documents focused on their specific domain
2. Update the "Last Updated" date in this README
3. If creating new planning docs, add them to the appropriate subdirectory
4. Update this index with a description of any new documents

## 🔄 Related Resources

- **Production Site**: [icodemybusiness.com](https://icodemybusiness.com)
- **Blog Content**: `blog/` directory
- **Dashboard Implementation**: `dashboard/` directory
- **API Documentation**: `api_gateway/` and `portal_backend/` directories