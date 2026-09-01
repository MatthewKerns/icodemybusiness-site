# ADR-F01: Agent Workflows Messaging + Top 3 Issues Chat Agent

## Status
Accepted

## Context

The site should make two things explicit to visitors:

1. **Positioning**: modern software runs via agent workflows. We put chat agents next to the data you need to oversee so the work gets done efficiently.
2. **Proof**: a working example on the homepage — a chat agent that guides a visitor (blab, free-form chat, optional document uploads) to identify the top 3 issues in their business right now.

This is a marketing/credibility feature as well as a product demo. It must be cheap to run, safe under abuse (rate-limited, bounded), and must produce something useful both for the visitor (their top 3 issues) and for us (qualified lead signal).

## Current Architecture (relevant parts)

- **Frontend**: Next.js 15 App Router, `src/app/page.tsx` renders the homepage.
- **Existing agent section** (`src/components/agent/AgentSection.tsx`): Retell-based widget (chat + voice) — iframe-delivered, voice-first, no file upload, opaque to our stack.
- **Backend**: Convex (`convex/` dir). `conversations` and `conversationMessages` tables exist but are tightly coupled to Retell (`retellCallId` is required). Cannot reuse as-is.
- **Auth**: Clerk. Free-tools page already uses a `createLead` → welcome-email flow; the agent feature should reuse this pattern for attribution but NOT require sign-in to try the agent (friction kills the demo).
- **Email delivery**: Resend, with React Email templates in `src/emails/`.
- **Rate limiting**: `convex-helpers` rate-limit tables already in schema.

## Decision

### 1. Philosophy messaging (lightweight)

Add a new landing-page section `AgentWorkflowsBlock` between the mobile story blocks / desktop hero and the `AgentSection`. Short headline + one-sentence thesis + three bullets on what "agents next to data" looks like. No new data model. No API calls.

### 2. Top 3 Issues agent (core work)

**Build native** — do not extend the Retell-based `AgentSection`. Retell is voice-first and doesn't support document uploads or our product's positioning (agents next to data). Build a first-party chat using the Anthropic SDK directly, on our server, streaming to the client.

**Components**:

- **`Top3IssuesAgent` React component** (`src/components/agent/top3issues/`): stateful chat UI, textarea + send, file-attachment chip list, streaming assistant replies, "Your top 3 issues (draft)" side panel that fills as the conversation progresses.
- **`/api/agent/top3/chat` POST route**: receives the current session messages + uploaded-file handles, calls Anthropic with streaming + the `top3-issues` system prompt, streams the response back to the client. Uses the Anthropic SDK with prompt caching on the system prompt.
- **`/api/agent/top3/upload` POST route**: accepts file uploads (PDF, txt, md, csv, docx; ≤5 MB per file; ≤5 files per session; ≤15 MB total per session). Stores via Convex `_storage`. Returns a `storageId` the client attaches to subsequent chat turns. Server extracts text (best-effort; unsupported types = friendly error).
- **Convex schema additions**: new `agentSessions` table (decoupled from Retell `conversations`) + new `agentSessionMessages` table. Persist every visitor interaction for lead-scoring and product-learning.
- **Structured output extraction**: at each assistant turn the server asks Claude to emit (as a tool call / structured block) the current draft of `top3Issues: Issue[]` where `Issue = { title, severity, evidence }`. This drives the side panel.

### 3. Lead capture

At the moment the session has 3 confirmed issues, the agent asks for an email to send the summary. Email capture hits the existing `createLead` mutation with `source: "top3-issues-agent"` and triggers a dedicated `Top3IssuesSummaryEmail` (React Email) via Resend. This is the "chat agents next to data → produces an outcome we email you" proof point.

## Rationale

- **SOLID / SRP (actors lens, `SOLID_QUICK_REFERENCE.md`)**: `conversations` is a Retell-shaped table (owned by the Retell-integration actor). The Top-3 agent's session shape (files, structured top-3 state, no `retellCallId`) changes for a different actor — the native-agent product owner. **Splitting tables avoids divergent change.** Forcing both into one table would make `retellCallId` optional, pollute indexes, and force every future change in either flow to consider the other.
- **Dependency Rule (`DEPENDENCY_RULE.md`)**: Anthropic SDK import lives in the API route layer (infrastructure), not in Convex functions (which stay provider-agnostic). Business rules ("what makes a top-3 session complete", "what triggers email") live in Convex mutations; LLM calls live in Next.js API routes. Dependencies point inward: API route → Convex (domain) → no SDK leakage into domain.
- **Plugin Architecture (`PLUGIN_ARCHITECTURE.md`)**: Anthropic is a plugin. The API route adapts Anthropic's streaming to our SSE response format. If we swap providers, only the route changes — the Convex data model and React component are unaffected.
- **Screaming Architecture (`SCREAMING_ARCHITECTURE.md`)**: folder name `src/components/agent/top3issues/` reads as a business capability ("identify top 3 issues"), not a technical layer ("llm-client"). The Convex file `convex/agentSessions.ts` names the domain concept, not the tech.
- **Humble Object (`HUMBLE_OBJECTS.md`)**: the React component is dumb — renders messages, dispatches actions. Session-state reducer is pure and unit-testable. Streaming-transport code is separate from conversation-logic code.

## Alternatives Considered

1. **Extend Retell**: Retell's chat widget is a closed iframe; no file uploads, no structured output, no server-side prompt-caching control. Rejected.
2. **Extend existing `conversations` table**: would make `retellCallId` optional and force every Retell-path query to filter by modality. Divergent change. Rejected.
3. **Put the agent behind sign-in**: kills the "try it" demo value. Rejected. Lead capture happens at the moment of value delivery (top-3 summary email).
4. **Vercel AI SDK's `useChat` hook on the client with a server Edge function**: adds a dependency layer we don't need — Anthropic SDK + Next.js route handler is sufficient and keeps us on one SDK. Rejected for now; revisit if we want multi-provider.
5. **Skip structured output, parse top-3 from free-text at the end**: loses the live "side panel fills as you talk" UX that sells the "agent next to your data" story. Rejected.

## Consequences

**Enables:**
- First-party conversation data (not opaque Retell iframes) → product learning, transcript review, prompt iteration.
- Demonstration of the "agent next to data" thesis: the side panel *is* the data, and it updates as the conversation progresses.
- Reusable pattern for future agent features (marketing discovery, support triage, etc.).

**Constrains:**
- We now run LLM inference costs. Needs rate limiting + max-turns cap + max-tokens cap.
- File upload surface area = new security responsibility (size, MIME validation, anti-DoS).
- Operational burden: Anthropic key management, quota monitoring (deferred — not in OBSV tier for this feature).

**New debt:**
- Two agent-conversation tables (Retell + native). If we build a third agent, we should extract a shared `sessions` abstraction. Flagged for re-evaluation when the third agent appears.

## Dependency Graph

### Blocked By
- None. All inputs available: Clerk, Convex, Resend, React Email, existing free-tools lead pattern.

### Blocks
- Future "agent catalog" on the site (each agent would follow this pattern).
- Lead-scoring enhancement that incorporates top-3 specificity as a signal.

### Critical Path Position
- Not on a dated milestone critical path. High-value demonstration of positioning → completing it unblocks marketing copy updates and conversion-rate testing.

### External Dependencies
- **`ANTHROPIC_API_KEY`** — must be provisioned in `.env.local` and deployment env (Dokploy staging + prod). Status: **needs provisioning** (flag for user).
- `@anthropic-ai/sdk` npm package — add dependency.
- Convex `_storage` — already available.
- Resend — already configured.

## Pre-Implementation Refactoring
None required. `AgentSection` (Retell) stays; new component lives alongside it.

## Affected Modules

**New files:**
- `src/components/landing/AgentWorkflowsBlock.tsx` — philosophy messaging section
- `src/components/agent/top3issues/Top3IssuesAgent.tsx` — main component
- `src/components/agent/top3issues/ChatMessage.tsx` — message bubble
- `src/components/agent/top3issues/FileAttachmentChip.tsx` — uploaded-file chip
- `src/components/agent/top3issues/Top3SidePanel.tsx` — draft top-3 display
- `src/components/agent/top3issues/useTop3Session.ts` — session reducer hook
- `src/components/agent/top3issues/types.ts` — shared types
- `src/app/api/agent/top3/chat/route.ts` — streaming Claude endpoint
- `src/app/api/agent/top3/upload/route.ts` — file upload → Convex storage
- `src/app/api/agent/top3/complete/route.ts` — email summary trigger
- `src/emails/Top3IssuesSummaryEmail.tsx` — summary email template
- `src/lib/agent/top3-prompt.ts` — system prompt + output schema
- `src/lib/agent/file-text-extract.ts` — text extraction helpers
- `convex/agentSessions.ts` — session CRUD + lead link
- `.feature-factory/arch.md` (this file)

**Modified files:**
- `convex/schema.ts` — add `agentSessions` + `agentSessionMessages` tables
- `src/app/page.tsx` — insert `AgentWorkflowsBlock` section
- `.env.example` — add `ANTHROPIC_API_KEY`
- `package.json` — add `@anthropic-ai/sdk`

## Long-Term Vision Alignment

Matches the broader positioning: "agent workflows, agents next to data." Every future product surface on this site (admin, portal, consulting) can host its own domain-specific agent. The homepage demo becomes the canonical pattern. Proves the thesis to a visitor in under 3 minutes.
