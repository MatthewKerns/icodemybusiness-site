# Wellness System - Technical Overview

## Architecture

The wellness system extends the existing `@agent-os/personal` package infrastructure, creating a parallel wellness-focused service layer.

## Component Reuse Strategy

### From Existing Infrastructure

| Existing Component | Wellness Adaptation | Implementation Notes |
|-------------------|-------------------|---------------------|
| `DailyBriefingService` | `WellnessBriefingService` | Orchestrates wellness data collection and email generation |
| `PersonalKPIExtractor` | `WellnessKPIExtractor` | Extracts wellness metrics from various sources |
| `InsightGenerator` | `WellnessInsightGenerator` | Generates personalized wellness insights |
| `EmailService` (Resend) | Direct reuse | No changes needed for email delivery |
| `daily-briefing-email.ts` | `wellness-briefing-email.ts` | New template focused on wellness metrics |
| `DailyBriefingReplyProcessor` | `WellnessReplyProcessor` | Handles wellness check-in responses |

## Data Models

### Core Entities

```typescript
interface WellnessCheckIn {
  id: string
  userId: string
  timestamp: Date
  energyLevel: 1 | 2 | 3 | 4 | 5
  moodScore: 1 | 2 | 3 | 4 | 5
  activities: WellnessActivity[]
  notes?: string
  coachingSessionId?: string
}

interface WellnessActivity {
  type: 'exercise' | 'meditation' | 'nutrition' | 'sleep' | 'social' | 'creative'
  duration?: number // minutes
  quality?: 1 | 2 | 3 | 4 | 5
  notes?: string
}

interface WellnessGoal {
  id: string
  userId: string
  category: string
  target: string
  frequency: 'daily' | 'weekly' | 'monthly'
  progress: number
  status: 'active' | 'paused' | 'completed'
}

interface FinancialPulse {
  monthlyTarget: number
  currentRevenue: number
  breakEvenPoint: number
  daysToBreakEven: number
  revenueHealth: 'ahead' | 'on-track' | 'behind'
}
```

## Service Architecture

### 1. WellnessBriefingService

```typescript
class WellnessBriefingService {
  // Orchestrates the entire wellness briefing process
  async generateDailyBriefing(userId: string): Promise<WellnessBriefing>

  // Components:
  - WellnessKPIExtractor: Gathers metrics
  - WellnessInsightGenerator: Creates insights
  - WellnessEmailComposer: Formats email
  - CoachingLinkGenerator: Creates personalized coaching URL
}
```

### 2. WellnessKPIExtractor

Calculates wellness metrics from multiple sources:
- Recent check-ins
- Activity patterns
- Goal progress
- Sleep data (if available)
- Financial pulse

### 3. WellnessInsightGenerator

Generates insights using modules:
- `EnergyTrendInsight`: Analyzes energy patterns
- `ActivityRecommendationInsight`: Suggests activities based on patterns
- `GoalProgressInsight`: Tracks goal achievement
- `FinancialWellnessInsight`: Links financial health to wellness
- `RecoveryInsight`: Identifies when rest is needed

### 4. AI Coaching Chatbot

```typescript
interface CoachingSession {
  sessionId: string
  userId: string
  startTime: Date
  endTime?: Date
  messages: CoachingMessage[]
  insights: string[]
  actionItems: string[]
}

class WellnessCoach {
  // Conversational interface for wellness support
  async startSession(userId: string, context?: string): Promise<CoachingSession>
  async processMessage(sessionId: string, message: string): Promise<CoachingResponse>
  async generateActionPlan(sessionId: string): Promise<ActionPlan>
}
```

## Integration Points

### Email System
- Reuses existing Resend configuration
- Sends at configured time (default: 7 AM)
- Includes unsubscribe/preference management

### Database
- Extends existing Supabase/PostgreSQL schema
- New tables: `wellness_checkins`, `wellness_goals`, `coaching_sessions`
- Shares user authentication with main system

### API Endpoints

```
POST /api/wellness/checkin
GET  /api/wellness/history
GET  /api/wellness/insights
POST /api/wellness/goals
GET  /api/wellness/coaching/start
POST /api/wellness/coaching/message
GET  /api/wellness/financial-pulse
```

## Deployment Strategy

### Phase 1: Core Infrastructure
1. Database schema migration
2. Basic check-in API
3. Manual wellness tracking

### Phase 2: Automated Briefing
1. WellnessBriefingService implementation
2. Email template design
3. Scheduled job setup

### Phase 3: AI Coaching
1. Coaching chatbot implementation
2. Conversation flow design
3. Integration with check-ins

### Phase 4: Advanced Features
1. Wearable device integration
2. Predictive wellness alerts
3. Team wellness features

## Security & Privacy

- All wellness data encrypted at rest
- User-controlled data sharing
- Separate wellness data permissions
- HIPAA compliance considerations for future
- Data retention policies (user-configurable)

## Monitoring & Analytics

### System Health
- Briefing generation success rate
- Email delivery metrics
- API response times
- Coaching session quality scores

### User Engagement
- Check-in frequency
- Coaching session duration
- Goal completion rates
- Feature usage patterns

## Configuration

```yaml
wellness:
  briefing:
    sendTime: "07:00"
    timezone: "user_preferred"
    frequency: "daily"

  coaching:
    model: "gpt-4"
    maxSessionDuration: 30
    followUpDelay: 24

  tracking:
    reminderFrequency: "twice_daily"
    minimumCheckIns: 1

  financial:
    updateFrequency: "weekly"
    includeInBriefing: true
```

## Future Enhancements

1. **Wearable Integration**: Apple Health, Fitbit, Whoop
2. **Team Wellness**: Company-wide wellness dashboards
3. **Predictive Alerts**: ML-based burnout prediction
4. **Wellness Challenges**: Gamification elements
5. **Professional Support**: Integration with therapists/coaches
6. **Biometric Tracking**: HRV, sleep quality, stress markers