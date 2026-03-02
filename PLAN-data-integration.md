# Data Integration Layer - Implementation Plan

## Current State

The dashboard is a fully static HTML/CSS/JS site hosted on GitHub Pages (icodemybusiness.com).
All data is hardcoded in HTML. No backend, no database, no APIs, no authentication.

---

## Architecture Decision: Supabase + Edge Functions

**Why Supabase over building a custom backend:**
- Postgres database with real-time subscriptions (dashboard auto-updates)
- Built-in auth (email/password, magic link - just for you)
- Edge Functions for server-side logic (Deno/TypeScript)
- Storage buckets for business card photos
- Row Level Security so only your account can access data
- Free tier covers a single-user dashboard easily
- Hosted - no server to maintain

**Why NOT a full framework conversion (Next.js, etc.):**
- The static HTML dashboard works. It's fast, simple, and GitHub Pages is free.
- Adding `fetch()` calls to Supabase from the existing JS is straightforward.
- Converting 8 HTML pages to React components adds complexity with no user-facing benefit.
- Matches your philosophy: keep things simple, break off complexity into separate services.

**The dashboard stays as static HTML.** We add a `data.js` module that handles all Supabase calls,
and update `app.js` + each page to render data from the API instead of hardcoded HTML.

---

## Database Schema

```sql
-- Core tables

create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  company text,
  role text,
  source text check (source in ('in-person', 'fathom', 'linkedin', 'referral', 'website', 'business-card', 'other')),
  stage text check (stage in ('new', 'follow-up', 'discovery', 'proposal', 'won', 'lost')) default 'new',
  notes text,
  business_card_url text,         -- Supabase Storage URL
  fathom_meeting_id text,         -- Links to Fathom meeting
  meeting_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  email_subject text,
  email_body text,                -- AI-drafted content
  status text check (status in ('draft', 'review', 'approved', 'scheduled', 'sent', 'replied')) default 'draft',
  send_at timestamptz,            -- When to send
  sent_at timestamptz,            -- When actually sent
  sequence_position int default 1, -- Email 1 of 3, etc.
  sequence_total int default 3,
  source text,                    -- 'fathom-auto', 'manual', 'business-card'
  created_at timestamptz default now()
);

create table content_drafts (
  id uuid primary key default gen_random_uuid(),
  platform text check (platform in ('linkedin', 'youtube', 'tiktok')),
  title text,
  body text,                      -- The actual draft content
  hook text,                      -- For TikTok/YouTube
  visual_notes text,              -- For TikTok
  status text check (status in ('generating', 'draft', 'ready', 'approved', 'scheduled', 'published')) default 'draft',
  publish_date date,
  source_meetings text[],         -- Array of Fathom meeting IDs that informed this
  source_strategy text,           -- Which strategy doc was used
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table schedule_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text check (category in ('dev', 'meeting', 'exercise', 'personal', 'content')),
  start_time timestamptz not null,
  end_time timestamptz,
  day_of_week int,                -- 0=Mon, 6=Sun (for recurring template)
  is_template boolean default false, -- true = weekly recurring block
  created_at timestamptz default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text check (status in ('planning', 'up-next', 'in-progress', 'review', 'done')) default 'planning',
  external_url text,              -- Link to dedicated management app
  priority_task text,             -- The 1-2 things to show on dashboard today
  priority_task_detail text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table outreach (
  id uuid primary key default gen_random_uuid(),
  partner_name text not null,
  partner_type text check (partner_type in ('affiliate', 'podcast', 'newsletter', 'collab', 'community')),
  audience_size text,
  audience_description text,
  status text check (status in ('prospect', 'pitched', 'negotiating', 'confirmed', 'active', 'completed')) default 'prospect',
  notes text,
  next_action text,
  next_action_date date,
  revenue numeric default 0,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null,
  sender_company text,
  sender_role text,
  platform text check (platform in ('linkedin', 'email', 'other')),
  preview text,                   -- First ~200 chars of message
  full_body text,
  suggested_reply text,           -- AI-generated reply suggestion
  status text check (status in ('unread', 'read', 'replied', 'archived')) default 'unread',
  lead_id uuid references leads(id), -- Link to lead if applicable
  received_at timestamptz default now(),
  created_at timestamptz default now()
);

create table metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null default current_date,
  -- Revenue
  revenue_mtd numeric,
  active_clients int,
  pipeline_value numeric,
  close_rate numeric,
  -- Content
  linkedin_impressions int,
  youtube_views int,
  tiktok_views int,
  email_open_rate numeric,
  -- Website
  website_visitors int,
  avg_session_duration text,
  bounce_rate numeric,
  cta_clicks int,
  -- Follow-ups
  followup_emails_sent int,
  followup_open_rate numeric,
  followup_reply_rate numeric,
  created_at timestamptz default now()
);
```

---

## Integration Points (Priority Order)

### Phase 1: Core Data Layer (Week 1-2)
**Goal: Dashboard reads/writes real data instead of hardcoded HTML**

```
Files to create:
  dashboard/data.js          -- Supabase client + all data functions
  dashboard/render.js        -- DOM rendering functions (replace hardcoded HTML)

Files to modify:
  dashboard/app.js           -- Import data.js, call render functions on page load
  dashboard/index.html       -- Empty data containers, filled by JS
  dashboard/leads.html       -- Same
  dashboard/content.html     -- Same
  dashboard/schedule.html    -- Same
  dashboard/projects.html    -- Same
  dashboard/outreach.html    -- Same
  dashboard/metrics.html     -- Same
  dashboard/messages.html    -- Same
```

**data.js responsibilities:**
- Initialize Supabase client (anon key is fine for single-user with RLS)
- Auth: login check, redirect to login page if not authenticated
- CRUD functions for every table
- Real-time subscriptions so dashboard updates live
- File upload to Supabase Storage (business card photos)

**How it works:**
1. Page loads -> `data.js` checks auth
2. If not logged in -> redirect to `/dashboard/login.html`
3. If logged in -> fetch data for this page from Supabase
4. `render.js` takes the data and builds the HTML (same markup, just dynamic)
5. Form submissions call `data.js` functions to insert/update rows
6. Real-time subscriptions update the UI when data changes

### Phase 2: Business Card OCR + Lead Auto-Create (Week 2-3)
**Goal: Upload a photo -> extract contact info -> create lead -> start follow-up**

```
Supabase Edge Function: process-business-card
  1. Receive uploaded image URL from Storage
  2. Call Claude Vision API to extract: name, company, role, email, phone
  3. Insert new lead row with extracted data
  4. Call draft-followup function
  5. Return extracted data to dashboard for review
```

**Flow:**
1. You snap/upload a business card photo on leads.html
2. Photo uploads to Supabase Storage bucket
3. Edge Function triggers (via database webhook or direct call)
4. Claude Vision reads the card -> extracts structured data
5. New lead created in `leads` table
6. Follow-up email auto-drafted (see Phase 3)
7. Dashboard shows the new lead + draft for your review

### Phase 3: AI Follow-up Email Drafting + Unipile Email (Week 3-4)
**Goal: Auto-draft personalized follow-up emails after meetings or card scans, send via your real email**

```
Supabase Edge Function: draft-followup
  Input: lead_id, context (meeting notes, card data, Fathom transcript)
  1. Fetch lead data
  2. Fetch any Fathom meeting transcript (if available)
  3. Call Claude API with your communication style + lead context
  4. Generate personalized follow-up email
  5. Insert into follow_ups table with status='review'
  6. Dashboard shows it for your approval
```

**Email sending via Unipile (replaces Resend):**
- Connect your Gmail/Outlook account to Unipile (one-time setup via hosted auth link)
- Edge Function: `send-followup` calls Unipile Email API to send from your actual inbox
- Emails come FROM matthew@icodemybusiness.com (not a transactional sender - much better deliverability)
- Unipile tracks opens, replies, and threading automatically
- When the lead replies, Unipile receives it -> webhook fires -> Edge Function updates follow_up status to 'replied'
- Scheduled sends: Supabase pg_cron checks for follow_ups where send_at < now() and status = 'approved', sends via Unipile

**Why Unipile instead of Resend:**
- Emails send from YOUR inbox, not a transactional domain (higher trust, lands in inbox)
- Two-way: you can also READ incoming replies, not just send
- Email threading preserved (replies show up in the same thread in your inbox)
- One API for email + LinkedIn + WhatsApp (see Phases 5 and 7)

### Phase 4: Fathom Integration (Week 4-5)
**Goal: Auto-detect meetings, pull transcripts, suggest follow-ups**

```
Supabase Edge Function: sync-fathom
  Runs on schedule (every 30 min) or via webhook if Fathom supports it
  1. Call Fathom API to get recent meetings
  2. For each new meeting:
     a. Pull transcript + attendee info
     b. Check if attendee matches existing lead (by email/name)
     c. If match: update lead, add meeting notes
     d. If no match: create new lead with source='fathom'
     e. Call draft-followup with transcript context
  3. Dashboard "Fathom Meeting Follow-ups" section shows real data
```

**Fathom API details to confirm:**
- API access level (may need paid plan)
- Webhook availability for real-time vs polling
- Transcript format and attendee metadata
- Rate limits

### Phase 5: Content Pipeline (Week 5-7)
**Goal: AI drafts LinkedIn posts, YouTube scripts, TikTok hooks from your data**

```
Supabase Edge Function: generate-content
  Runs daily (scheduled via pg_cron)
  1. Pull recent Fathom meeting insights
  2. Pull your content strategy docs (stored in Storage or a strategy table)
  3. Pull past high-performing content (stored in content_drafts with engagement metrics)
  4. Call Claude API with:
     - Your voice/style guidelines
     - Meeting insights
     - Strategy framework
     - Content calendar (what's needed next)
  5. Generate drafts for each platform
  6. Insert into content_drafts with status='ready'
  7. Dashboard shows them for review/approval
```

**Content publishing via Unipile (after approval):**
- LinkedIn: Unipile LinkedIn API posts directly to your profile - NO LinkedIn partner approval needed
- YouTube: Descriptions/metadata only (you still record/upload the video)
- TikTok: Script + caption ready for you to record

**Unipile makes LinkedIn posting immediate** - no weeks-long app review process.
When you click "Approve & Schedule" on a LinkedIn draft, the Edge Function calls
Unipile's LinkedIn post creation endpoint. Done. It also pulls back engagement
data (impressions, comments, reactions) for the metrics page.

```
Supabase Edge Function: publish-linkedin
  Triggered when content_draft status changes to 'approved' and platform = 'linkedin'
  1. Call Unipile POST /posts with the draft body
  2. Store Unipile post_id in content_drafts table
  3. Update status to 'published'
  4. Later: aggregate-metrics function pulls engagement data via Unipile
```

### Phase 6: Schedule + Calendar Integration (Week 6-7)
**Goal: Schedule shows real data, syncs with your calendar**

**Option A: Google Calendar API**
- Read your existing calendar events
- Map them to dashboard categories (dev, meeting, exercise, personal, content)
- Two-way sync: changes in dashboard reflect in Google Calendar

**Option B: Dashboard-native scheduling**
- Keep the weekly block template in the database
- Override with specific events
- Export .ics files if you want to sync to calendar apps

**Recommendation:** Start with Option B (simpler, no OAuth dependency), add Google Calendar read-only sync later.

### Phase 7: Messages Aggregation via Unipile (Week 7-8)
**Goal: Pull LinkedIn messages + emails into one unified inbox**

**Unipile solves the hardest problem here.** The original plan flagged LinkedIn message
access as requiring LinkedIn partner program approval. Unipile bypasses this entirely.

```
Supabase Edge Function: sync-messages
  Runs every 15 min (or triggered by Unipile webhook)
  1. Call Unipile GET /chats to list recent conversations across all connected accounts
  2. For each new/updated message:
     a. Check platform (linkedin, email, whatsapp, instagram)
     b. Match sender to existing lead (by name/email)
     c. Insert/update messages table
     d. Call Claude API to generate suggested reply based on:
        - Sender context (lead data, meeting history)
        - Your communication style
        - Conversation thread history
  3. Dashboard messages page renders from messages table
```

**Replying from the dashboard:**
- You click "Use Suggestion" or write a custom reply
- Edge Function calls Unipile to send the reply ON THE ORIGINAL PLATFORM
- LinkedIn message -> reply goes back to LinkedIn
- Email -> reply goes back as email (in the same thread)
- WhatsApp -> reply goes back to WhatsApp
- The sender sees a normal reply in their inbox, not a redirected message

**Connected platforms (all through Unipile):**
- LinkedIn messages + InMails
- Gmail / Outlook email
- WhatsApp (if you use it for business)
- Instagram DMs (if relevant)

**This means the Messages page becomes a true unified inbox** - not a manual log.
Real messages flowing in from all platforms, AI-suggested replies, one-click send back
to the original platform.

### Phase 8: Metrics Aggregation (Week 8-9)
**Goal: Real numbers flowing into the metrics page**

**Data sources:**
- LinkedIn impressions/engagement: **Unipile** (pull post engagement data for content you published)
- YouTube views: YouTube Data API (easy, free quota is generous)
- TikTok views: TikTok API or manual
- Website visitors: Plausible Analytics or Google Analytics Data API
- Email metrics: **Unipile** (open/reply tracking on follow-ups sent through your inbox)
- Revenue: Manual entry or Stripe API if using Stripe

```
Supabase Edge Function: aggregate-metrics
  Runs daily at midnight
  1. Pull data from each source API
  2. Calculate deltas (vs last week, last month)
  3. Insert new metrics_snapshot row
  4. Dashboard reads the latest snapshot
```

---

## Authentication

Simple setup since this is a single-user dashboard:

```
New file: dashboard/login.html
  - Email + password form
  - Calls Supabase auth.signInWithPassword()
  - On success, redirects to dashboard/index.html
  - Session stored in localStorage (Supabase JS handles this)

Row Level Security on all tables:
  - All policies: auth.uid() = 'your-specific-user-uuid'
  - Only your account can read or write anything
```

---

## File Structure After Integration

```
dashboard/
├── index.html              (main dashboard - data containers, no hardcoded data)
├── login.html              (NEW - auth gate)
├── leads.html
├── content.html
├── schedule.html
├── projects.html
├── outreach.html
├── metrics.html
├── messages.html
├── styles.css              (unchanged)
├── app.js                  (updated - calls data.js on load, handles UI interactions)
├── data.js                 (NEW - Supabase client, all API calls)
├── render.js               (NEW - DOM rendering functions)
└── config.js               (NEW - Supabase URL + anon key, feature flags)

supabase/
├── migrations/
│   └── 001_initial_schema.sql
├── functions/
│   ├── process-business-card/index.ts
│   ├── draft-followup/index.ts
│   ├── send-followup/index.ts         -- Sends via Unipile (email, LinkedIn, WhatsApp)
│   ├── sync-fathom/index.ts
│   ├── generate-content/index.ts
│   ├── publish-linkedin/index.ts      -- Posts to LinkedIn via Unipile
│   ├── sync-messages/index.ts         -- Pulls messages from Unipile (all platforms)
│   ├── enrich-lead/index.ts           -- LinkedIn profile enrichment via Unipile
│   ├── aggregate-metrics/index.ts
│   └── unipile-webhook/index.ts       -- Receives Unipile webhooks (new messages, replies)
└── config.toml
```

---

## External Services Required

| Service | Purpose | Cost | Priority |
|---------|---------|------|----------|
| Supabase | Database, auth, storage, edge functions | Free tier (sufficient) | Phase 1 |
| Claude API (Anthropic) | Business card OCR, email drafting, content generation, reply suggestions | Pay per use (~$5-20/mo at your volume) | Phase 2 |
| **Unipile** | **Unified API: LinkedIn messaging/posting, email send/receive/track, WhatsApp, Instagram** | **~$55/mo (10 accounts)** | **Phase 3** |
| Fathom | Meeting transcripts | Existing subscription + API access | Phase 4 |
| YouTube Data API | Video metrics | Free (10K quota/day) | Phase 8 |
| Google Analytics API | Website metrics | Free | Phase 8 |

**Note: Unipile replaces Resend** (email) and the LinkedIn official API. One service
covers email sending/receiving, LinkedIn messaging + posting, and opens up WhatsApp
and Instagram as bonus channels. See "Unipile Integration" section below for details.

---

## Unipile Integration (Detailed)

### What Unipile Is

Unipile (unipile.com) is a unified communications API. You connect your LinkedIn, email,
WhatsApp, and other accounts to Unipile, and then interact with ALL of them through one
REST API. It's the single biggest simplification to this integration plan.

**What it replaces:**
- ~~Resend~~ (email sending) -> Unipile sends from your real inbox
- ~~LinkedIn official API~~ (restrictive, needs partner approval) -> Unipile gives full access
- ~~IMAP connection~~ (email reading) -> Unipile handles it
- ~~Manual message logging~~ -> Unipile syncs messages automatically

### Setup (One-Time)

```
1. Sign up at unipile.com ($55/mo for 10 connected accounts)
2. Connect your accounts via Unipile's hosted auth flow:
   - LinkedIn account (username/password or cookie-based auth)
   - Gmail or Outlook (OAuth flow)
   - WhatsApp (QR code scan, optional)
   - Instagram (optional)
3. Store your Unipile DSN + access token in Supabase secrets
4. All Edge Functions that need comms access use the Unipile Node SDK
```

### Unipile Node SDK Usage

```javascript
import { UnipileClient } from 'unipile-node-sdk';

const client = new UnipileClient('https://{YOUR_DSN}', '{YOUR_ACCESS_TOKEN}');

// Send a LinkedIn message
await client.messaging.sendMessage({
  account_id: 'linkedin-account-id',
  chat_id: 'conversation-id',
  text: 'Hey James, great chatting yesterday...'
});

// Send an email from your inbox
await client.emails.sendEmail({
  account_id: 'gmail-account-id',
  to: 'james@meridian.com',
  subject: 'Great meeting yesterday',
  body: 'Hey James, following up on our conversation...'
});

// List recent LinkedIn messages
const chats = await client.messaging.listChats({ account_id: 'linkedin-account-id' });

// Create a LinkedIn post
await client.posts.createPost({
  account_id: 'linkedin-account-id',
  text: 'Most founders think automation means replacing themselves...'
});

// Get LinkedIn profile data (for lead enrichment)
const profile = await client.users.getProfile({ account_id: 'linkedin-account-id', identifier: 'linkedin-url' });
```

### Where Unipile Touches Each Phase

| Phase | Without Unipile | With Unipile |
|-------|----------------|--------------|
| **3: Follow-up emails** | Resend (transactional sender, send-only) | Send from YOUR inbox, track replies, threading preserved |
| **5: Content publishing** | Copy-paste to LinkedIn manually (API needs partner approval) | Post to LinkedIn directly via API, pull engagement data |
| **7: Messages** | Manual logging or hacky email forwarding | Real-time inbox sync across LinkedIn + email + WhatsApp |
| **8: Metrics** | LinkedIn metrics manual or unavailable | Pull post impressions/engagement + email open/reply rates |
| **Bonus: Lead enrichment** | Manual lookup | Auto-pull LinkedIn profile data when adding a lead |

### New Capability: LinkedIn Lead Enrichment

When you add a lead (from business card, Fathom, or manual entry), an Edge Function can
call Unipile to pull their LinkedIn profile:

```
Supabase Edge Function: enrich-lead
  Triggered when a new lead is created with a LinkedIn URL or enough info to search
  1. Call Unipile to search/fetch LinkedIn profile
  2. Pull: photo, headline, company, role, recent posts, mutual connections
  3. Update lead record with enriched data
  4. Dashboard lead card shows full profile context
```

This means when you scan a business card, you don't just get the OCR text - you get
their full LinkedIn profile attached automatically.

### New Capability: Multi-Channel Follow-up Sequences

With Unipile, follow-up sequences aren't limited to email:

```
Sequence example for a new lead (Sarah Chen):
  Day 0: Email follow-up (sent from your inbox via Unipile)
  Day 2: LinkedIn connection request with personalized note (via Unipile)
  Day 5: If no email reply, LinkedIn message (via Unipile)
  Day 7: Final email follow-up (via Unipile)
```

Each step is AI-drafted, shows up on your dashboard for approval, and sends on
the original platform. The lead sees normal messages, not automated-looking blasts.

### Updated follow_ups Table

```sql
-- Add channel support to follow_ups
alter table follow_ups add column channel text
  check (channel in ('email', 'linkedin', 'whatsapp', 'instagram'))
  default 'email';
alter table follow_ups add column unipile_message_id text;  -- Track sent message
alter table follow_ups add column unipile_account_id text;  -- Which connected account
```

### Cost Analysis

- Unipile: $55/mo for 10 connected accounts
- You need: 1 LinkedIn + 1 email = 2 accounts minimum
- Room for: WhatsApp, Instagram, additional email accounts
- Replaces: Resend ($0 free tier, but limited + send-only)
- Net value: massive - unified inbox, LinkedIn posting, lead enrichment, multi-channel sequences

---

## Migration Path (Static -> Live Data)

Each page gets converted independently. The pattern for every page:

1. **Add empty containers** with `id` attributes where data goes
2. **Keep the hardcoded HTML as fallback** (shown while data loads)
3. **data.js fetch** replaces containers with real data on load
4. **Form submissions** call data.js instead of just showing toasts
5. **Remove hardcoded HTML** once real data is flowing

This means you can migrate one page at a time without breaking the others.
The dashboard keeps working throughout the entire migration.

---

## Sequence Summary

```
Phase 1 (Week 1-2):  Supabase setup, auth, data.js, render.js
                      Dashboard reads/writes to real database
                      Forms actually save data, pages load from DB

Phase 2 (Week 2-3):  Business card upload -> Claude Vision OCR -> auto-create lead
                      + LinkedIn profile enrichment via Unipile

Phase 3 (Week 3-4):  Unipile setup + AI email drafting
                      Connect LinkedIn + email accounts to Unipile
                      Follow-up emails send from YOUR inbox via Unipile
                      Multi-channel sequences (email + LinkedIn message)

Phase 4 (Week 4-5):  Fathom API sync -> auto-detect meetings -> suggest follow-ups

Phase 5 (Week 5-7):  Content pipeline -> AI drafts LinkedIn/YouTube/TikTok content daily
                      LinkedIn posts publish directly via Unipile (no copy-paste)

Phase 6 (Week 6-7):  Schedule becomes database-driven, optional calendar sync

Phase 7 (Week 7-8):  Unified inbox via Unipile
                      Real-time LinkedIn + email + WhatsApp messages
                      AI-suggested replies, send back on original platform

Phase 8 (Week 8-9):  Metrics from real sources
                      LinkedIn engagement via Unipile
                      Email open/reply rates via Unipile
                      YouTube API, Google Analytics
```

Each phase is independently deployable. You get value after Phase 1.
Unipile connects in Phase 3 and progressively powers Phases 5, 7, and 8.
