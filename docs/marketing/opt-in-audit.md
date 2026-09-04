# Opt-in audit — 2026-09-04 (cmo)

Question from Matthew: "are we missing opt ins?" Answer: yes, in two senses.
Tree: `agent/cmo/team-protocol` @ `origin/main` 23b9758. Commands: `grep -rlE 'type="email"' src`,
`grep -rn EmailCapture src`, `grep -rniE 'unsubscribe|consent|opt' src convex`.

## A. Where a visitor can give an email today (VERIFIED)

| Surface | Component | What they are told they get | Marketing consent? |
|---|---|---|---|
| `/free-tools` | `EmailCapture source=free-tools` | download links by email, "no account required" | none — transactional framing |
| `/academy` | `EmailCapture source=academy` | format/price/start date; "No spam, and you can leave any time" | implied list; **"leave any time" is not built** (copy-principles §3) |
| `/services` | `EmailCapture source=offers-page` | notify when a client slot opens | none; subtitle "I take on a limited number of projects at a time" is an agent-authored business claim (§2) |
| `/mango` | `EmailCapture source=mango-mcp` | setup instructions + Advanced waitlist | none |
| `/` → assessment end | `DiscoveryRecap` | "Where should I send the write-up?" | none — transactional |
| Top 3 issues agent | `Top3IssuesAgent` | "Email me this summary. No account needed." | none — transactional |
| Agent error fallback | `AgentErrorBoundary` → `EmailCapture` | — | none |

Storage: `leads` table has `email, name, source, variant, score, sessionId, clerkUserId` — **no consent
field, no timestamp of what they agreed to, no suppression/unsubscribe state.** No email template
contains an unsubscribe link (`convex/emails.ts` `wrapHtml` has no slot; `email-followup` reports its
Phase 2 adds one).

## B. Missing opt-ins, ranked

1. **No low-commitment opt-in on the pages that get the traffic.** `/`, `/consulting`, `/book` have
   no email field at all; the only way to give an email on the homepage is to finish the assessment
   (Clerk sign-in gate first). A visitor who is not ready to book or be assessed leaves with no way to
   stay in touch. Fix: one capture on `/` and `/consulting` with an honest, specific promise
   (the free training pillar content is the natural offer — ties to `content/` and R-013).
2. **No marketing consent on any capture.** Every form promises a specific deliverable. Sending
   those addresses a nurture sequence (email-followup's approved plan) is a different use than what
   was asked for. Minimum: one line under each form saying follow-up emails come with it and can be
   stopped, plus `leads.consentedAt` / `consentSource` so the sequence can filter. This is a schema
   change → ask-first (AGENTS.md).
3. **No way out.** No unsubscribe anywhere; `/academy` promises one. email-followup Phase 2 builds
   suppression + the footer slot; until it lands, the academy line is a live §3 violation.
4. **No blog / content opt-in** because there is no blog route (R-013). The four pillars have no
   landing surface to capture on.

## C. Claims in this file
| claim | label | source |
|---|---|---|
| capture surfaces + copy above | VERIFIED | greps listed at top, this tree |
| `leads` has no consent field | VERIFIED | `convex/schema.ts:20-37` |
| no unsubscribe in any template | VERIFIED | grep across `convex/emails.ts`, `src/app/api/email`, `src/lib` → 0 hits |
| email-followup adds unsubscribe in Phase 2 | REPORTED | email-followup message 09-04 |
| a nurture sequence is approved | REPORTED | email-followup, plan `~/.claude/plans/lets-plan-the-funnel-immutable-quail.md` (not read by cmo) |
