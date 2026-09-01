# Claude Series: Project Management with Claude

A recurring educational content series showing how to run real client projects end-to-end using Claude. One continuous example that builds across episodes, demonstrating features naturally as they come up.

**Principle: Make the system work first. Add tooling only when it solves a real friction point.**

---

## The Problem We're Solving

You have multiple client projects running at once. Each one has:
- A scope and roadmap
- Daily work that needs to happen
- A need to show measurable progress in reasonable time
- Communication with the client

Without a system, things slip. You lose track of what moved forward, what's stalled, and what needs your attention today. The goal is a simple, repeatable workflow that keeps every project moving — using Claude as the thinking partner, not as a shiny automation layer.

---

## The System (Simple Version)

### Per Client: One Claude Project
- Create a Claude Project for each client engagement
- Project Knowledge contains: scope doc, roadmap table, client preferences
- Every conversation has full context automatically — no re-explaining
- This is the foundation. Everything else builds on this.

### The Roadmap: A Markdown Table in Project Knowledge
- Simple markdown table — milestones, status, target dates, dependencies
- Lives inside the Claude Project as a Knowledge file
- You update it manually when things change
- Claude references it in every conversation because it's always loaded
- **No database, no MCP, no API.** Just a file Claude can see.

### The Daily Workflow
1. **Start of day:** Open each active client project in Claude
2. **Tell Claude what you did yesterday** (or paste from your calendar/notes)
3. **Ask:** "Given the roadmap, what should I focus on today and why?"
4. **Claude responds** with prioritized next steps + reasoning based on the roadmap
5. **Do the work**
6. **End of day:** Update the roadmap table if any milestones moved

### The Weekly Check
- Once a week per project: "Are we on track? What's at risk?"
- Claude compares current status against target dates and flags slips
- Draft a client status update from the same conversation

---

## What "Working" Looks Like

Before adding any automation or tooling, this system should deliver:

- [ ] Every project has a clear, current roadmap Claude can reference
- [ ] Daily priorities are generated with reasoning tied to the roadmap
- [ ] You can tell when a project is falling behind before it's a crisis
- [ ] Client updates take 2 minutes because Claude drafts them from context
- [ ] Nothing falls through the cracks across 3-5 active projects
- [ ] Measurable progress each week on every active project

**Only when all of the above are consistently working do we consider automation.**

---

## Episode Outline

### Phase 1: The Working System (Episodes 1-5)

#### Episode 1: "One Project, One Claude Project"
**Claude features:** Projects, Project Knowledge, custom instructions
- Create a Claude Project for a client
- Add scope doc and client background as Project Knowledge
- Set custom instructions (communication style, project goals)
- First conversation: "What should our kickoff agenda cover?"
- **Academy tie-in:** Claude 101

#### Episode 2: "A Roadmap Claude Can Think With"
**Claude features:** Structured data in Project Knowledge
- Build a markdown roadmap table (milestones, dates, status, dependencies)
- Add it as Project Knowledge
- Ask Claude: "What's the critical path?" / "Where are the risks?"
- Show how Claude reasons about dependencies and timeline
- **Academy tie-in:** AI Fluency: Framework & Foundations

#### Episode 3: "The Daily Priority Conversation"
**Claude features:** Projects context, conversational workflow
- Morning routine: tell Claude what happened yesterday
- Claude cross-references the roadmap and suggests today's focus
- Each suggestion comes with reasoning: "This is priority because X depends on it and the deadline is Y"
- Show how this catches things you'd otherwise miss
- **Academy tie-in:** Claude 101 (effective prompting)

#### Episode 4: "Weekly Health Check & Client Updates"
**Claude features:** Projects context, longer conversations
- End-of-week review: "Are we on track across all milestones?"
- Claude flags timeline risks, stalled items, scope drift
- "Draft a client update email for this week" — Claude writes it from full project context
- Update the roadmap table based on actual progress
- **Academy tie-in:** AI Fluency: Framework & Foundations

#### Episode 5: "Managing 3-5 Projects Without Losing Your Mind"
**Claude features:** Multiple Projects, workflow patterns
- How to structure your day across multiple client projects
- Morning routine: cycle through each project, get priorities, stack-rank across all projects
- Pattern: "Which of my projects needs the most attention today and why?"
- Show the portfolio view — all projects, all statuses, one prioritized list
- **Academy tie-in:** AI Fluency: Framework & Foundations

---

### Phase 2: Earning Automation (Episodes 6-8)

Only after Phase 1 is battle-tested. Each automation solves a specific friction point discovered while using the manual system.

#### Episode 6: "Automating the Daily Briefing"
**Prerequisite:** You've done the daily conversation manually for 2+ weeks and know exactly what you want it to produce.
**Claude features:** Claude API, scheduled scripts
- Simple Python script that sends yesterday's activity + roadmap to Claude API
- Runs on a schedule, outputs a daily briefing
- **This replaces the manual morning conversation — not a new feature, just automation of what already works**
- **Academy tie-in:** Building with the Claude API

#### Episode 7: "Reusable Playbooks with Skills"
**Prerequisite:** You've drafted enough client updates and standups to know the exact format you want.
**Claude features:** Agent Skills in Claude Code
- Create a `/standup` Skill and a `/weekly-report` Skill
- Codify the patterns that emerged from your manual workflow
- Share across all client projects
- **Academy tie-in:** Introduction to Agent Skills

#### Episode 8: "Connecting Live Data (When You Actually Need It)"
**Prerequisite:** The static roadmap table has become a bottleneck — you're updating it in two places, or you need real-time data Claude can't see.
**Claude features:** MCP servers
- Build a simple MCP server to read from your actual data source
- Only connect what's proven necessary from the manual workflow
- **Academy tie-in:** Introduction to MCP / Advanced MCP

---

## Roadmap Table Template

Store this as a Project Knowledge file named `roadmap.md`:

```markdown
# Project Roadmap: [Client Name]

Last updated: [date]

| Milestone | Phase | Status | Target Date | Dependencies | Notes |
|-----------|-------|--------|-------------|--------------|-------|
| Discovery & scope | 1 | Complete | 2026-03-01 | None | Client signed off |
| Data architecture | 1 | In Progress | 2026-03-15 | Discovery | Schema review pending |
| Agent prototype | 2 | Not Started | 2026-04-01 | Data arch | Python + Claude API |
| Client testing | 2 | Not Started | 2026-04-15 | Prototype | 2-week UAT window |
| Production deploy | 3 | Not Started | 2026-05-01 | Testing | AWS infrastructure |

## Status Key
- **Complete** — Done and delivered
- **In Progress** — Actively working on it
- **Not Started** — Upcoming
- **Blocked** — Can't proceed (see notes)
- **At Risk** — May miss target date

## Key Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-01 | Use Python + Claude API | Client team familiar with Python |
```

## Daily Prompt Template

Paste this into your client's Claude Project each morning:

```
Yesterday I worked on:
- [what you did]
- [what you did]

Given our roadmap, what should I focus on today?
For each item, explain why it's the priority right now — what depends on it,
what deadline it's tied to, or what risk it mitigates.
```

## Weekly Review Prompt Template

```
It's end of week. Review our roadmap:
1. Which milestones moved forward this week?
2. Which ones didn't move — and why might that be?
3. Are any target dates at risk? What would need to happen to stay on track?
4. Draft a short client status update email covering this week's progress and next week's plan.
```

---

## Content Format Per Episode

- **Blog post** on icodemybusiness.com/blog (long-form, practical, with screenshots)
- **Short social post** (LinkedIn / TikTok) — 60-second summary or "here's today's workflow"
- **Batching:** Write/record 5-10 at once, publish daily
- Each post links to the relevant Anthropic Academy course

## Cross-Promotion

- Each post links to free discovery call
- "Want help setting this up for your projects? Book a free discovery call."
- Info product tie-in: project management template pack (roadmap, prompts, workflow guide)

---

## Anthropic Academy Course Mapping

| Episode | Academy Course | Why |
|---------|---------------|-----|
| 1 | Claude 101 | Core features, Projects setup |
| 2 | AI Fluency: Framework & Foundations | Structured thinking with AI |
| 3 | Claude 101 | Effective prompting, daily workflow |
| 4 | AI Fluency: Framework & Foundations | Weekly review patterns |
| 5 | AI Fluency: Framework & Foundations | Multi-project organizational thinking |
| 6 | Building with the Claude API | Automating a proven workflow |
| 7 | Intro to Agent Skills | Codifying patterns into Skills |
| 8 | Intro to MCP / Advanced MCP | Live data when you've earned the need |

---

## Success Criteria Before Moving to Phase 2

Do not automate until you can answer YES to all of these:

1. Have you used the manual daily workflow for at least 2 weeks?
2. Do you know exactly what output format works best for you?
3. Can you articulate what's slow or painful about the manual process?
4. Is the friction you're solving worth the maintenance of automation?
5. Are all active projects consistently making measurable weekly progress?

---

*Last updated: March 2026*
