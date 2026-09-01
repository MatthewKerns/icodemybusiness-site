# F-01 FUNC Summary — Top 3 Issues Agent

## Scope delivered
- Native streaming chat agent on the homepage using `@anthropic-ai/sdk` + Claude Opus 4.7, SSE deltas to the browser.
- Convex-backed session store (`agentSessions`, `agentSessionMessages`) decoupled from Retell `conversations`.
- File upload (≤5MB each, ≤15MB total, ≤5 files) with Convex `_storage` + server-side text extraction for textual MIME types.
- Draft top-3 issues parsed from a fenced `top3-issues` JSON block on every assistant turn.
- Lead capture only at the value-delivery moment (summary email). Uses existing `leads.createLead`.
- Philosophy block on homepage (`AgentWorkflowsBlock`) explaining agent-near-data approach.

## Key modules added
- `convex/agentSessions.ts` — CRUD + `generateUploadUrl` mutation. sessionId-as-auth model.
- `convex/schema.ts` — two new tables with indexes `by_sessionId`, `by_leadId`, `by_status`, `by_sessionId_timestamp`.
- `src/lib/agent/top3-prompt.ts` — system prompt + pure `extractTop3Issues` / `stripIssuesFence` helpers.
- `src/lib/agent/file-text-extract.ts` — UTF-8 decode + truncate at 50K chars for textual MIMEs.
- `src/components/agent/top3issues/useTop3Session.ts` — pure reducer (Humble Object). Full unit test coverage.
- `src/components/agent/top3issues/Top3IssuesAgent.tsx` — streaming client, file chips, side panel, email capture.
- `src/app/api/agent/top3/{chat,upload,complete}/route.ts` — SSE stream, file upload proxy, summary email + lead.
- `src/emails/Top3IssuesSummaryEmail.tsx` — React Email summary template.
- `src/components/landing/AgentWorkflowsBlock.tsx` — philosophy pillars.

## Tests
- `src/lib/agent/__tests__/top3-prompt.test.ts` — parsing, fence strip, caps, severity fallback.
- `src/components/agent/top3issues/__tests__/useTop3Session.test.ts` — reducer actions, file gating, allThreeConfirmed.
- `npm test` → 106 pass, `npx tsc --noEmit` clean.

## Non-goals / deferred
- Voice modality (Retell already covers that separately).
- PDF / DOCX extraction — reserved for a later ticket; currently silently skipped with `isSupported: false`.
- Authenticated admin session viewer page — only the `adminListSessions` query exists.
- Prompt cache verification via `usage.cache_read_input_tokens` not wired to telemetry.
