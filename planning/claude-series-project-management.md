# Claude Series: Project Management with Claude

A recurring educational content series showing how to run real client projects end-to-end using Claude. One continuous example that builds across episodes, demonstrating features naturally as they come up.

---

## The Concept

**One running example:** Managing a client project (e.g., building an AI agent system for a client) entirely through Claude — from kickoff to delivery. Each post/video adds a layer, so the audience builds alongside us.

**Why project management?** Everyone manages projects. It's relatable whether you're a developer, solopreneur, or running a team. And it naturally touches every Claude feature without feeling forced.

---

## The Setup We're Demonstrating

### Per Client: One Claude Project
- Create a Claude Project for each client engagement
- Project Knowledge contains: scope doc, roadmap table, client preferences, tech stack notes
- Every conversation in the project has full context automatically — no re-explaining

### Daily Automated Briefing
- Scheduled task runs each morning in the project folder
- Pulls what was done yesterday from calendar/task system
- Cross-references the project roadmap
- Generates today's next steps with reasoning for each one
- Posts the briefing to the project (or a channel/doc)

### Project Roadmap as a Living Table
- Roadmap stored as a structured table (CSV, markdown table, or connected via MCP)
- Claude Project can read and reference it in every conversation
- Updates to the roadmap reflect immediately in daily briefings
- Tracks: milestone, status, target date, dependencies, notes

---

## Episode Outline

### Episode 1: "Setting Up a Client Project in Claude"
**Claude features shown:** Projects, Project Knowledge, custom instructions
**Content:**
- Create a new Claude Project for a client
- Add project scope and client background as Project Knowledge
- Set custom instructions so Claude knows the project context in every chat
- First conversation: "What should our kickoff agenda cover?"
- **Anthropic Academy tie-in:** Claude 101 (core features, prompting)

### Episode 2: "Building a Project Roadmap Claude Can Actually Use"
**Claude features shown:** Projects, structured data in Knowledge, artifacts
**Content:**
- Build a roadmap table (milestones, dates, status, dependencies)
- Store it as Project Knowledge so Claude references it automatically
- Ask Claude to identify risks, suggest timeline adjustments, flag blockers
- Demo: "Given our roadmap, what's the critical path?"
- **Anthropic Academy tie-in:** AI Fluency: Framework & Foundations (4D Framework)

### Episode 3: "Daily Standup with Claude — Automated Next Steps"
**Claude features shown:** Claude API, scheduled automation, Projects
**Content:**
- Set up a scheduled script (cron / GitHub Action / simple Python)
- Script pulls yesterday's completed tasks from calendar (Google Calendar API or similar)
- Sends them to Claude API with the project roadmap context
- Claude returns today's priorities with reasoning for each
- Output goes to a daily log file or Slack/email
- **Anthropic Academy tie-in:** Building with the Claude API

### Episode 4: "Connecting Your Tools with MCP"
**Claude features shown:** MCP servers, tool integration
**Content:**
- Build a simple MCP server that reads the project roadmap table
- Connect it so Claude can query live project status, not just static Knowledge
- Demo: Claude pulls current milestone status and suggests what to focus on
- Bonus: MCP server for calendar integration
- **Anthropic Academy tie-in:** Introduction to Model Context Protocol

### Episode 5: "Client Communication on Autopilot"
**Claude features shown:** Projects context, API, prompt engineering
**Content:**
- Use project context to draft client status updates
- Weekly summary: what was done, what's next, any blockers
- Claude writes it in the client's preferred communication style (stored in Project Knowledge)
- Demo: "Draft this week's client update email"
- **Anthropic Academy tie-in:** Claude 101 (effective prompting)

### Episode 6: "Skills — Reusable Project Management Playbooks"
**Claude features shown:** Agent Skills in Claude Code
**Content:**
- Create a Skill for project standup generation
- Create a Skill for weekly client reporting
- Share Skills across multiple client projects
- Demo: `/standup` and `/weekly-report` as reusable commands
- **Anthropic Academy tie-in:** Introduction to Agent Skills

### Episode 7: "Advanced Roadmap Intelligence"
**Claude features shown:** Advanced MCP, multi-source data
**Content:**
- MCP server reads from multiple sources: roadmap table + calendar + git commits
- Claude correlates what was planned vs. what was built vs. what shipped
- Auto-detects scope drift, timeline slip, or velocity changes
- Demo: "Are we on track for the Phase 2 milestone?"
- **Anthropic Academy tie-in:** Advanced MCP

### Episode 8: "Running Multiple Client Projects"
**Claude features shown:** Multiple Projects, organizational patterns
**Content:**
- How to structure Projects when you have 3-5 active clients
- Cross-project resource planning
- Portfolio-level view: which projects need attention today?
- Demo: morning briefing that spans all active projects
- **Anthropic Academy tie-in:** AI Fluency: Framework & Foundations

---

## Technical Architecture

```
Daily Flow:
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Calendar    │────>│  Scheduled   │────>│  Claude API     │
│  (yesterday) │     │  Script      │     │  (w/ project    │
└─────────────┘     │  (cron/GHA)  │     │   context)      │
                    └──────────────┘     └────────┬────────┘
                                                  │
                    ┌──────────────┐               │
                    │  Roadmap     │───────────────┘
                    │  Table       │  (via MCP or Project Knowledge)
                    └──────────────┘
                                                  │
                                         ┌────────v────────┐
                                         │  Daily Briefing │
                                         │  - Next steps   │
                                         │  - Reasoning    │
                                         │  - Blockers     │
                                         └─────────────────┘
```

### Roadmap Table Format (stored in Project Knowledge or via MCP)

| Milestone | Phase | Status | Target Date | Dependencies | Notes |
|-----------|-------|--------|-------------|--------------|-------|
| Discovery & scope | 1 | Complete | 2026-03-01 | None | Client signed off |
| Data architecture | 1 | In Progress | 2026-03-15 | Discovery | Schema review pending |
| Agent prototype | 2 | Not Started | 2026-04-01 | Data arch | Python + Claude API |
| Client testing | 2 | Not Started | 2026-04-15 | Prototype | 2-week UAT window |
| Production deploy | 3 | Not Started | 2026-05-01 | Testing | AWS infrastructure |

### Scheduled Script Skeleton (Episode 3)

```python
# daily_briefing.py — runs via cron each morning
import anthropic
from google_calendar import get_yesterdays_events  # or similar

# 1. Pull yesterday's activity
yesterday = get_yesterdays_events()

# 2. Load project roadmap
with open("roadmap.md") as f:
    roadmap = f.read()

# 3. Ask Claude for today's priorities
client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system=f"""You are a project manager assistant.
Here is the current project roadmap:
{roadmap}""",
    messages=[{
        "role": "user",
        "content": f"""Yesterday I completed:
{yesterday}

Based on our roadmap, what should I focus on today?
For each task, explain WHY it's the priority right now."""
    }]
)

print(response.content[0].text)
```

---

## Content Format Per Episode

- **Blog post** on icodemybusiness.com/blog (long-form with code)
- **Short social post** (LinkedIn / TikTok) — 60-second "here's what I built today" clip or summary
- **Batching strategy:** Record/write 5-10 at once, schedule daily publishing
- Each post links to the relevant Anthropic Academy course for deeper learning

## Publishing Cadence

- Batch create 5-10 posts at a time
- Publish 1 per day on social channels
- Blog posts can be 2-3 per week (longer form)
- Series runs as long as there's material — easily extendable

## Cross-Promotion

- Each post links to our free discovery call
- "Want me to set this up for YOUR business? Book a free discovery call"
- Info product tie-in: sell the complete project management template pack
- Demonstrates our expertise while teaching

---

## Anthropic Academy Course Mapping

| Episode | Primary Academy Course | Why |
|---------|----------------------|-----|
| 1 | Claude 101 | Core features, Projects |
| 2 | AI Fluency: Framework & Foundations | Structured thinking with AI |
| 3 | Building with the Claude API | API automation |
| 4 | Intro to MCP | Tool connections |
| 5 | Claude 101 | Prompt engineering |
| 6 | Intro to Agent Skills | Reusable Skills |
| 7 | Advanced MCP | Multi-source integration |
| 8 | AI Fluency: Framework & Foundations | Organizational patterns |

---

## Open Questions

- [ ] Best way to connect roadmap table to Claude Project — static Knowledge file vs. MCP server vs. Google Sheets MCP?
- [ ] Calendar integration: Google Calendar API vs. an existing MCP server for calendar?
- [ ] Where does the daily briefing output go — file, Slack, email, all three?
- [ ] Should we build this as a real system for our own client projects first, then document?

---

*Last updated: March 2026*
