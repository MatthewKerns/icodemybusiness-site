# iCodeMyBusiness - Full System Architecture

## Three Pillars

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  PILLAR 1: EXTERNAL SITE          icodemybusiness.com               │
│  ─────────────────────                                              │
│  Landing page + voice agent + testimonials + about + pricing        │
│  Single CTA everywhere: Book a Call                                 │
│  You answer every call personally                                   │
│                                                                     │
│         ↓ (prospect books a call, you close them)                   │
│                                                                     │
│  PILLAR 2: CLIENT PORTAL          portal.icodemybusiness.com        │
│  ────────────────────────                                           │
│  Process mapping (custom discovery agents)                          │
│  Project updates + Loom videos + auto-emails                        │
│  Feature requests + bug reports                                     │
│  Plan selection + upgrade                                           │
│                                                                     │
│         ↓ (feeds into your internal view)                           │
│                                                                     │
│  PILLAR 3: INTERNAL OPS           icodemybusiness.com/dashboard     │
│  ──────────────────────                                             │
│  3 kanban boards:                                                   │
│    Board 1: Lead Generation → get them to a discovery call          │
│    Board 2: Discovery & Planning → BMAD process                     │
│    Board 3: Implementation, Testing & Delivery                      │
│  Google Doc workflow: template → copy per client → track in boards  │
│  + daily dashboard (content, schedule, messages, metrics)           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Pillar 1: External Site (icodemybusiness.com)

**Purpose:** Get the right people to book a call with you. That's it.
One CTA. No other conversion paths. No contact forms. No email capture.
Book a call or leave.

### Pages

**1. Landing Page (index.html) — EXISTS, needs update**
- Hero: core offer, clear value prop
- Problem/solution section
- Process overview (5-step pipeline)
- Single CTA: Book a Call (links to Calendly/Cal.com)
- Voice agent widget (see below)

**2. Testimonials Page — NEW**
- Client results and quotes
- Before/after transformations
- Video testimonials if available
- CTA: Book a Call

**3. About Page — NEW**
- Your story (Amazon → e-commerce → ego death → iCodeMyBusiness + Arise Group)
- The team (Chris, Mekaiel, Trent)
- Your philosophy: freedom through systems, AI acceleration, real code not templates
- CTA: Book a Call

**4. Pricing Page — NEW**
- Subscription plans with clear tiers
- What's included at each level (response times, feature request volume, etc.)
- FAQ section
- CTA: Book a Call to discuss which plan fits

### Voice Agent

An AI voice agent embedded on the external site that:
- Greets visitors, asks what they're looking for
- Explains your services conversationally
- Overcomes common objections
- Answers questions about process, pricing ballpark, timeline
- Guides them toward booking a call
- Trained on your content, your story, your process

**Implementation options:**
- Vapi.ai (voice AI platform, embeddable widget)
- Bland.ai (conversational AI)
- ElevenLabs Conversational AI
- Custom: Claude API + Web Speech API (more control, more work)

**Voice agent knows:**
- Your service offering (custom business systems, not templates)
- Your process (Discovery → BMAD → AutoClaude → Agent Teams → Testing)
- Pricing structure (ballpark ranges, directs to call for specifics)
- Common objections and responses
- When to say "let's get you on a call with Matthew to discuss specifics"

### Single CTA Architecture

Every page has ONE call-to-action: **Book a Call**

```
Landing page:   [Book a Discovery Call] → Calendly/Cal.com
Testimonials:   [Book a Call] → same link
About:          [Book a Call] → same link
Pricing:        [Book a Call to Discuss] → same link
Voice agent:    "Would you like to book a call?" → same link
```

The call booking tool (Calendly/Cal.com) should:
- Show your available slots
- Collect: name, email, company, what they need help with
- Auto-create a lead in Supabase on booking (via webhook)
- Send confirmation + reminder emails

### What Happens on the Call

You answer personally. On the call you:
1. Ask why they booked the call
2. Listen to their problems
3. Explain what you can do and what you've done (reference case studies)
4. Walk through the process and strategy
5. Share pricing to get started
6. If they move forward → create their client portal account

---

## Pillar 2: Client Portal (portal.icodemybusiness.com)

**Purpose:** Where clients go after they say yes. This is their workspace.
Separate site, separate login, separate deploy.

### What clients can do

**A. Process Mapping (Discovery Phase)**
- Map out their business processes in as much detail as they want
- Use your proprietary tools (custom agents built on your BMAD methodology)
- These agents guide them through discovery questions
- Output: structured process documentation that feeds into your BMAD design docs

```
Client logs in → "Map Your Processes" section
  → Custom agent asks structured questions about their workflows
  → Client describes their pain points, current tools, manual steps
  → Agent organizes responses into process documentation
  → You review the output on your internal dashboard
  → This becomes the input to your BMAD Discovery phase
```

**B. Project Updates (Implementation Phase)**
- You post updates when you complete work
- Each update includes:
  - Written summary of what was done
  - Loom video walkthrough (embedded)
  - Links to staging/preview environments
- Client gets auto-email notification for every update via Unipile

```
You post an update → client_updates table
  → Edge Function sends email via Unipile:
    "New update on your project: [title]"
    "[summary paragraph]"
    "[Watch the Loom video →]"
    "[View in portal →]"
  → Client sees it in their portal timeline
```

**C. Feature Requests + Bug Reports**
- Structured submission form:
  - Type: Feature / Bug / Change / Question
  - Title + Description + Attachments
- On submit:
  - Auto-email confirms receipt
  - Auto-email includes response timeline based on their subscription plan:
    - Essential: "We'll review within 48 hours"
    - Growth: "We'll review within 24 hours"
    - Scale: "We'll review within 4 hours"
  - Request appears on your internal dashboard for triage

**D. Plan Management**
- See current subscription plan
- Upgrade/downgrade plan
- View what's included at each tier
- Billing integration (Stripe)

### Database Schema (Client Portal)

```sql
create table clients (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  name text not null,
  company text,
  email text not null unique,
  auth_user_id uuid,              -- Supabase auth user
  plan text check (plan in ('essential', 'growth', 'scale')) default 'essential',
  plan_started_at timestamptz,
  stripe_customer_id text,
  status text check (status in ('onboarding', 'active', 'paused', 'completed')) default 'onboarding',
  created_at timestamptz default now()
);

create table client_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  project_id uuid references projects(id),
  display_name text,
  current_phase text,             -- 'discovery', 'planning', 'sprint-1', 'sprint-2', 'testing', 'delivered'
  progress_percent int default 0,
  next_milestone text,
  next_milestone_date date,
  created_at timestamptz default now()
);

create table client_updates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  client_project_id uuid references client_projects(id),
  title text not null,
  body text not null,             -- Written summary
  loom_url text,                  -- Loom video embed URL
  preview_url text,               -- Staging/preview link
  email_sent boolean default false,
  email_sent_at timestamptz,
  created_at timestamptz default now()
);

create table work_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  client_project_id uuid references client_projects(id),
  type text check (type in ('feature', 'bug', 'change', 'question')) not null,
  title text not null,
  description text,
  attachments text[],
  status text check (status in ('submitted', 'acknowledged', 'in-progress', 'resolved', 'closed')) default 'submitted',
  priority text check (priority in ('low', 'medium', 'high', 'urgent')),
  resolution_notes text,
  response_sla_hours int,         -- Set based on client plan
  acknowledged_at timestamptz,    -- When you first responded
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create table request_comments (
  id uuid primary key default gen_random_uuid(),
  work_request_id uuid references work_requests(id),
  author_type text check (author_type in ('client', 'admin')),
  author_name text,
  body text not null,
  created_at timestamptz default now()
);

create table process_maps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  client_project_id uuid references client_projects(id),
  title text not null,
  agent_conversation jsonb,       -- Full conversation with discovery agent
  extracted_processes jsonb,      -- Structured process documentation
  status text check (status in ('in-progress', 'completed', 'reviewed')) default 'in-progress',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,             -- 'essential', 'growth', 'scale'
  display_name text,
  price_monthly numeric,
  response_sla_hours int,         -- 48, 24, 4
  features jsonb,                 -- List of included features
  stripe_price_id text,
  active boolean default true
);
```

### Auto-Email Flows (via Unipile Edge Functions)

```
1. Client submits feature request / bug report
   → Immediate auto-email:
     "We received your [type]: [title]"
     "Based on your [plan] plan, we'll review this within [SLA hours]."
     "You can track the status in your portal."

2. You post a project update
   → Auto-email:
     "New update on [project name]: [update title]"
     "[summary]"
     "[Watch the walkthrough video →]"
     "[View in your portal →]"

3. You change a request status
   → Auto-email:
     "Your [type] '[title]' has been moved to [new status]"
     "[resolution notes if resolved]"

4. You submit a deliverable for review
   → Auto-email:
     "A new deliverable is ready for your review: [title]"
     "[Preview it here →]"
     "[Approve or request changes in your portal →]"
```

---

## Pillar 3: Internal Operations (icodemybusiness.com/dashboard)

**Purpose:** Your daily command center. Everything you need to see and do,
organized around three workflow boards plus your existing daily ops view.

### Three Kanban Boards

The core of internal ops is three boards. Each board represents a phase
of the client lifecycle. Keep it simple. Google Doc templates at each step.

**Board 1: Lead Generation Funnel**
```
Columns: Awareness → Engaged → Call Booked → Call Completed → Proposal Sent
```
How leads flow in:
- LinkedIn content engagement → Unipile detects DM or comment
- Website visit → voice agent conversation → book a call
- In-person networking → business card scan
- Fathom meeting → auto-detected
- Referral → manual add

Each card = one lead. Shows: name, company, source, last touchpoint, next action.

**Board 2: Discovery & Planning**
```
Columns: Client Onboarded → Process Mapping → BMAD Design → Specs Complete
```
When a lead converts (Board 1 "won" → Board 2 "Client Onboarded"):
- Client portal account created
- Client starts mapping their processes using your custom agents
- You review their process maps
- BMAD design doc created (copy Google Doc template, rename, put in client folder)
- Specs finalized → moves to Board 3

**Board 3: Implementation, Testing & Delivery**
```
Columns: Sprint Backlog → In Progress → Testing → Client Review → Delivered
```
- Each card = one deliverable or sprint chunk (NOT individual tasks)
- Track what tests are done vs. what tests need to be done
- When you move to "Client Review" → auto-posts update to client portal + Loom
- When client approves → moves to "Delivered"

### Google Doc Workflow

The process is intentionally simple:
1. You have a Google Doc template for each phase (Discovery template, BMAD template, Sprint template)
2. For each client at each step, copy the doc, rename it, put it in the client's folder
3. The kanban card links to the Google Doc
4. The board tracks status, the doc holds the details

```sql
-- Track the Google Doc workflow
alter table client_projects add column google_drive_folder_url text;

create table process_docs (
  id uuid primary key default gen_random_uuid(),
  client_project_id uuid references client_projects(id),
  template_name text,             -- 'discovery', 'bmad-design', 'sprint-plan', 'test-plan'
  google_doc_url text,            -- Link to the copied doc
  phase text,                     -- Which board/phase this belongs to
  status text check (status in ('not-started', 'in-progress', 'complete')) default 'not-started',
  created_at timestamptz default now()
);
```

### Board Cards (What You See)

Each board card is minimal. 1-2 cards visible per client max.

```sql
create table board_cards (
  id uuid primary key default gen_random_uuid(),
  board text check (board in ('lead-gen', 'discovery', 'implementation')) not null,
  column_name text not null,      -- e.g., 'awareness', 'sprint-backlog', 'testing'
  column_order int default 0,     -- Position within column
  -- What's on the card
  client_id uuid references clients(id),
  lead_id uuid references leads(id),    -- For Board 1 (pre-client)
  title text not null,
  subtitle text,                  -- Company name, project name
  doc_url text,                   -- Link to Google Doc
  next_action text,               -- One line: what needs to happen next
  -- Testing tracking (Board 3)
  tests_total int,
  tests_passed int,
  -- Meta
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Daily Dashboard (Existing, Refined)

The daily dashboard view you already have stays, but now it pulls from real data
and is organized around what matters each day:

```
TODAY'S DASHBOARD
├── Board Summaries (3 boards, what needs attention)
│   ├── Lead Gen: "2 calls booked today, 1 proposal to send"
│   ├── Discovery: "Process map review for GreenTech"
│   └── Implementation: "3 items in testing, 1 client review pending"
│
├── Content to Review (LinkedIn post, YouTube script, TikTok)
├── Messages to Reply (unified inbox via Unipile)
├── Schedule (today's blocks)
├── Follow-ups Due (auto-drafted, waiting for your approval)
└── Metrics Snapshot
```

### SOPs (Internal Process Documentation)

SOPs live in the dashboard as checklists that auto-trigger at transitions.

```sql
create table sops (
  id uuid primary key default gen_random_uuid(),
  category text check (category in ('onboarding', 'discovery', 'delivery', 'support', 'sales')),
  title text not null,
  steps jsonb not null,           -- [{step: "Send welcome email", auto: true}, ...]
  trigger_event text,             -- 'lead_won', 'discovery_complete', 'sprint_complete'
  created_at timestamptz default now()
);

create table sop_checklists (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid references sops(id),
  client_id uuid references clients(id),
  board_card_id uuid references board_cards(id),
  steps_completed jsonb,
  status text check (status in ('active', 'completed', 'blocked')) default 'active',
  started_at timestamptz default now(),
  completed_at timestamptz
);
```

**Key SOPs:**
- **Client Onboarding:** Lead won → welcome email → portal access → kickoff call → process mapping
- **Discovery:** Process maps received → BMAD template copied → design review → specs sign-off
- **Sprint Delivery:** Sprint planned → dev → test → Loom recorded → update posted → client review
- **Support:** Request received → auto-acknowledge → triage → assign to sprint → resolve → notify

---

## Full Database Schema

```sql
-- ═══════════════════════════════════════════
-- LEADS & FOLLOW-UPS (Board 1: Lead Gen)
-- ═══════════════════════════════════════════

create table leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  company text,
  role text,
  source text check (source in ('in-person', 'fathom', 'linkedin', 'referral', 'website', 'voice-agent', 'business-card', 'other')),
  stage text check (stage in ('awareness', 'engaged', 'call-booked', 'call-completed', 'proposal-sent', 'won', 'lost')) default 'awareness',
  notes text,
  business_card_url text,
  fathom_meeting_id text,
  meeting_date timestamptz,
  calendly_event_id text,         -- From booking CTA
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  channel text check (channel in ('email', 'linkedin', 'whatsapp')) default 'email',
  email_subject text,
  email_body text,
  status text check (status in ('draft', 'review', 'approved', 'scheduled', 'sent', 'replied')) default 'draft',
  send_at timestamptz,
  sent_at timestamptz,
  sequence_position int default 1,
  sequence_total int default 3,
  source text,                    -- 'fathom-auto', 'manual', 'business-card', 'voice-agent'
  unipile_message_id text,
  unipile_account_id text,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════
-- CLIENTS & PROJECTS (Board 2 & 3)
-- ═══════════════════════════════════════════

create table subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_name text,
  price_monthly numeric,
  response_sla_hours int,
  features jsonb,
  stripe_price_id text,
  active boolean default true
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id),
  name text not null,
  company text,
  email text not null unique,
  auth_user_id uuid,
  plan text references subscription_plans(name),
  plan_started_at timestamptz,
  stripe_customer_id text,
  status text check (status in ('onboarding', 'active', 'paused', 'completed')) default 'onboarding',
  created_at timestamptz default now()
);

create table client_projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  display_name text,
  current_phase text,
  progress_percent int default 0,
  next_milestone text,
  next_milestone_date date,
  google_drive_folder_url text,
  created_at timestamptz default now()
);

create table process_maps (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  client_project_id uuid references client_projects(id),
  title text not null,
  agent_conversation jsonb,
  extracted_processes jsonb,
  status text check (status in ('in-progress', 'completed', 'reviewed')) default 'in-progress',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table process_docs (
  id uuid primary key default gen_random_uuid(),
  client_project_id uuid references client_projects(id),
  template_name text,
  google_doc_url text,
  phase text,
  status text check (status in ('not-started', 'in-progress', 'complete')) default 'not-started',
  created_at timestamptz default now()
);

create table client_updates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  client_project_id uuid references client_projects(id),
  title text not null,
  body text not null,
  loom_url text,
  preview_url text,
  email_sent boolean default false,
  email_sent_at timestamptz,
  created_at timestamptz default now()
);

create table work_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id),
  client_project_id uuid references client_projects(id),
  type text check (type in ('feature', 'bug', 'change', 'question')) not null,
  title text not null,
  description text,
  attachments text[],
  status text check (status in ('submitted', 'acknowledged', 'in-progress', 'resolved', 'closed')) default 'submitted',
  priority text check (priority in ('low', 'medium', 'high', 'urgent')),
  resolution_notes text,
  response_sla_hours int,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create table request_comments (
  id uuid primary key default gen_random_uuid(),
  work_request_id uuid references work_requests(id),
  author_type text check (author_type in ('client', 'admin')),
  author_name text,
  body text not null,
  created_at timestamptz default now()
);

-- ═══════════════════════════════════════════
-- BOARDS (All 3 kanban boards)
-- ═══════════════════════════════════════════

create table board_cards (
  id uuid primary key default gen_random_uuid(),
  board text check (board in ('lead-gen', 'discovery', 'implementation')) not null,
  column_name text not null,
  column_order int default 0,
  client_id uuid references clients(id),
  lead_id uuid references leads(id),
  title text not null,
  subtitle text,
  doc_url text,
  next_action text,
  tests_total int,
  tests_passed int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ═══════════════════════════════════════════
-- SOPs
-- ═══════════════════════════════════════════

create table sops (
  id uuid primary key default gen_random_uuid(),
  category text check (category in ('onboarding', 'discovery', 'delivery', 'support', 'sales')),
  title text not null,
  steps jsonb not null,
  trigger_event text,
  created_at timestamptz default now()
);

create table sop_checklists (
  id uuid primary key default gen_random_uuid(),
  sop_id uuid references sops(id),
  client_id uuid references clients(id),
  board_card_id uuid references board_cards(id),
  steps_completed jsonb,
  status text check (status in ('active', 'completed', 'blocked')) default 'active',
  started_at timestamptz default now(),
  completed_at timestamptz
);

-- ═══════════════════════════════════════════
-- CONTENT & COMMS (Daily ops)
-- ═══════════════════════════════════════════

create table content_drafts (
  id uuid primary key default gen_random_uuid(),
  platform text check (platform in ('linkedin', 'youtube', 'tiktok')),
  title text,
  body text,
  hook text,
  visual_notes text,
  status text check (status in ('generating', 'draft', 'ready', 'approved', 'scheduled', 'published')) default 'draft',
  publish_date date,
  source_meetings text[],
  source_strategy text,
  unipile_post_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null,
  sender_company text,
  sender_role text,
  platform text check (platform in ('linkedin', 'email', 'whatsapp', 'other')),
  preview text,
  full_body text,
  suggested_reply text,
  status text check (status in ('unread', 'read', 'replied', 'archived')) default 'unread',
  lead_id uuid references leads(id),
  unipile_chat_id text,
  received_at timestamptz default now(),
  created_at timestamptz default now()
);

create table schedule_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text check (category in ('dev', 'meeting', 'exercise', 'personal', 'content')),
  start_time timestamptz not null,
  end_time timestamptz,
  day_of_week int,
  is_template boolean default false,
  created_at timestamptz default now()
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

create table metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null default current_date,
  revenue_mtd numeric,
  active_clients int,
  pipeline_value numeric,
  close_rate numeric,
  linkedin_impressions int,
  youtube_views int,
  tiktok_views int,
  email_open_rate numeric,
  website_visitors int,
  avg_session_duration text,
  bounce_rate numeric,
  cta_clicks int,
  calls_booked int,
  followup_emails_sent int,
  followup_open_rate numeric,
  followup_reply_rate numeric,
  created_at timestamptz default now()
);
```

---

## External Services

| Service | Purpose | Cost |
|---------|---------|------|
| Supabase | Database, auth (admin + clients), storage, edge functions | Free tier |
| Claude API | Voice agent, business card OCR, email drafting, content gen, process mapping agents | ~$10-30/mo |
| Unipile | LinkedIn + email + WhatsApp unified API | $55/mo |
| Stripe | Client billing, plan management | 2.9% + 30¢/txn |
| Fathom | Meeting transcripts | Existing subscription |
| Cal.com or Calendly | Call booking (single CTA) | Free or ~$12/mo |
| Loom | Video walkthroughs embedded in client updates | Free or $12.50/mo |
| Voice AI (Vapi/Bland/ElevenLabs) | Website voice agent widget | ~$30-50/mo |
| YouTube Data API | Video metrics | Free |
| Google Analytics | Website metrics | Free |

---

## File Structure

```
icodemybusiness.com (GitHub Pages → eventually Vercel)
├── index.html                    -- Landing page
├── testimonials.html             -- Client results + quotes
├── about.html                    -- Your story + team
├── pricing.html                  -- Subscription plans
├── shared/
│   ├── styles.css                -- Shared public site styles
│   ├── nav.js                    -- Shared nav + voice agent widget
│   └── voice-agent.js            -- Voice agent integration
└── dashboard/                    -- Internal ops (auth-gated)
    ├── index.html                -- Daily command center
    ├── login.html                -- Admin auth
    ├── boards.html               -- NEW: Three kanban boards view
    ├── leads.html                -- Lead pipeline detail
    ├── clients.html              -- Client management
    ├── content.html              -- Content drafts
    ├── schedule.html             -- Weekly/daily planner
    ├── outreach.html             -- Affiliate partnerships
    ├── metrics.html              -- Analytics
    ├── messages.html             -- Unified inbox
    ├── sops.html                 -- SOP library + active checklists
    ├── styles.css
    ├── app.js
    ├── data.js                   -- Supabase client
    ├── render.js                 -- DOM rendering
    └── config.js                 -- Supabase URL + keys

portal.icodemybusiness.com (separate repo, Vercel/Netlify)
├── index.html                    -- Client login (magic link)
├── dashboard.html                -- Project overview + updates + Loom videos
├── process-map.html              -- Discovery agent interface
├── requests.html                 -- Submit + track feature/bug requests
├── plan.html                     -- View/upgrade subscription plan
├── styles.css
├── app.js
├── data.js                       -- Same Supabase, client RLS policies
└── config.js

supabase/
├── migrations/
│   ├── 001_core_schema.sql       -- Leads, follow-ups, content, messages, schedule
│   ├── 002_client_schema.sql     -- Clients, projects, updates, requests
│   └── 003_boards_sops.sql       -- Board cards, SOPs, checklists
├── functions/
│   ├── process-business-card/    -- Claude Vision OCR
│   ├── draft-followup/           -- AI email drafting
│   ├── send-followup/            -- Send via Unipile
│   ├── sync-fathom/              -- Fathom meeting sync
│   ├── generate-content/         -- AI content drafts
│   ├── publish-linkedin/         -- Post via Unipile
│   ├── sync-messages/            -- Pull messages via Unipile
│   ├── enrich-lead/              -- LinkedIn profile enrichment
│   ├── aggregate-metrics/        -- Daily metrics snapshot
│   ├── unipile-webhook/          -- Incoming message handler
│   ├── notify-client/            -- Auto-email on updates/requests
│   ├── process-map-agent/        -- Discovery agent for client process mapping
│   ├── calendly-webhook/         -- Auto-create lead on call booking
│   └── triage-request/           -- AI triage incoming client requests
└── config.toml
```

---

## Build Sequence

```
PHASE 1: External Site Foundation
  - Update landing page (single CTA: Book a Call)
  - Build testimonials page
  - Build about page
  - Build pricing page
  - Integrate Cal.com/Calendly booking widget
  - Shared nav across all public pages

PHASE 2: Backend Foundation
  - Provision Supabase project
  - Deploy database schema
  - Admin auth (your login)
  - data.js + render.js for dashboard
  - Dashboard reads/writes real data

PHASE 3: Lead Automation
  - Unipile setup (connect LinkedIn + email)
  - Business card OCR (Claude Vision)
  - AI follow-up email drafting
  - Multi-channel follow-up sequences
  - LinkedIn profile enrichment
  - Cal.com webhook → auto-create lead
  - Board 1 (Lead Gen) live with real data

PHASE 4: Client Portal MVP
  - Separate repo + deploy (portal.icodemybusiness.com)
  - Client auth (magic link via Supabase)
  - Project dashboard with progress + updates
  - Feature request / bug report submission
  - Auto-email notifications via Unipile
  - Stripe integration for plan management
  - Board 2 (Discovery) + Board 3 (Implementation) live

PHASE 5: Discovery Agents
  - Custom process mapping agent (Claude API)
  - Client-facing interface in portal
  - Agent guides client through discovery questions
  - Output feeds into your BMAD design docs

PHASE 6: Voice Agent
  - Select provider (Vapi/Bland/ElevenLabs)
  - Train on your content, process, pricing
  - Embed widget on all external pages
  - Fallback: always routes to Book a Call

PHASE 7: Content Pipeline + Fathom
  - Fathom API sync
  - AI content generation (LinkedIn, YouTube, TikTok)
  - LinkedIn auto-publishing via Unipile
  - Unified inbox via Unipile

PHASE 8: Metrics + Polish
  - Aggregate metrics from all sources
  - SOPs with auto-triggered checklists
  - Google Doc workflow tracking
  - Full daily dashboard with board summaries
```
