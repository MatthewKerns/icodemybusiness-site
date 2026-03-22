# Wellness System Documentation

This directory contains documentation and plans for the AI-powered personal wellness management system designed to combat burnout and maintain peak performance.

## 📁 Directory Structure

```
wellness/
├── README.md           # This file - overview and index
├── docs/              # Implementation documentation
│   └── system-overview.md
└── plans/             # Planning and design documents
    └── ai-wellness-coach-plan.md
```

## 🎯 System Purpose

The wellness system is designed to address the fundamental challenge of maintaining personal health while building a business. It recognizes that:
- Taking care of yourself → Having energy → Doing amazing work → Helping people → Financial reward
- Neglecting basics (food, water, sunlight, walking, passion projects) leads to low energy and motivation
- Too much passive content consumption drains energy needed for great work

## 🔧 Core Components

### 1. Daily Wellness Briefing
- Separate morning email from business briefing
- Personalized wellness insights and reminders
- Links to coaching chatbot for support

### 2. AI Coaching Chatbot
- Helps overcome objections to self-care
- Connects self-care to bigger vision
- Provides motivational support and accountability

### 3. Wellness Tracking System
- Multiple choice forms for quick check-ins
- Free-form conversational tracking
- Progress visualization and trends

### 4. Financial Pulse Monitor
- Monthly revenue target tracking
- Break-even analysis
- Connection between wellness and financial performance

## 🏗️ Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| System Architecture | ✅ Planned | Full plan documented in blog |
| Daily Briefing Service | ⬜ Not Started | Builds on existing DailyBriefingService pattern |
| Coaching Chatbot | ⬜ Not Started | Requires conversational AI setup |
| Tracking Forms | ⬜ Not Started | Need database schema design |
| Financial Monitor | ⬜ Not Started | Integrate with existing financial systems |

## 📚 Related Documentation

- **Blog Post**: [Building an AI Wellness Coach](../blog/wellness/claude-code-plan-mode-building-ai-wellness-coach.html) - Full Claude Code plan mode output
- **Content Strategy**: [Content Amplification](../planning/strategy/content-amplification.md) - Includes wellness as content pillar
- **Architecture**: Builds on `@agent-os/personal` package patterns

## 🚀 Quick Start

To implement the wellness system:
1. Review the [AI Wellness Coach Plan](./plans/ai-wellness-coach-plan.md)
2. Check the [System Overview](./docs/system-overview.md) for technical details
3. Start with the Daily Wellness Briefing component (most reusable code)
4. Test with personal use before productizing

## 🎨 Design Principles

1. **Energy First**: Every feature should increase, not drain, user energy
2. **Connection to Vision**: Always link self-care to larger business goals
3. **Simple Tracking**: Make it easier to track than not to track
4. **Actionable Insights**: Provide specific, doable recommendations
5. **Compassionate Coaching**: Support without judgment

## 🔄 Integration Points

- **Personal Package**: Reuses components from `@agent-os/personal`
- **Email Service**: Uses existing Resend integration
- **Database**: Shares infrastructure with business management system
- **Dashboard**: Can display wellness metrics alongside business KPIs

## 📈 Success Metrics

- Daily briefing open rate
- Wellness check-in completion rate
- Energy level trends
- Correlation between wellness scores and productivity
- Revenue impact of improved wellness habits