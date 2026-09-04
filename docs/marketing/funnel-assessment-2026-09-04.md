# Funnel assessment — 2026-09-04 (cmo, first pass)

Companion to `funnel-baseline.md` (the numbers) and `opt-in-audit.md` (capture surfaces).
Sources: Sonnet subagent code audits (file:line cited), PostHog 206048 queries run by cmo,
peer reports from `business-intake`, `offer`, `email-followup` (labelled REPORTED).

## 1. The key constraint, with full context

**Nothing in the funnel can be learned from or improved until real visitors reach it, and none do:
`icodemybusiness.com` still serves the GitHub Pages placeholder.** (ROADMAP R-002, `owner: matthew`,
`evidence: verified` 09-02; re-confirmed by business-intake 09-04; zero pageviews from that host in
30 days — VERIFIED, `funnel-baseline.md`.)

Why this is *the* constraint and not one of several:
- Every number we hold is staging/localhost traffic: 65 pageviews, 52 people, 3 assessment starts,
  1 lead, 1 book click, 0 bookings, over 30 days. An unknown share is Matthew and agent sessions.
- The lead flow Matthew described (REPORTED via `offer`: warm network ~20–30 people + inbound from
  four content pillars) has nowhere to land. A warm-network email pointing at the apex domain today
  lands on "Internal Design Portfolio (Static Mockups)".
- Three sessions are building conversion machinery (nurture sequence, recap corrections, offer
  letter) whose effect cannot be measured at n≈0. That work is not wasted, but its *ordering*
  relative to cutover is: each week before cutover is a week of zero learning.
- Cutover is a human gate (`docs/RELEASE_PIPELINE.md`; deploy session executes; Matthew decides).
  No agent can move it. What agents *can* do is make the site safe to cut over: the pre-cutover
  list in §5.

What must be true before cutover (from the audits, all VERIFIED unless marked):
1. Clerk production keys (R-003, `owner: matthew`): the live bundle ships `pk_test_…`; dev instances
   have usage caps, so sign-in/sign-up (optional in the funnel, required for `/admin`) fails under
   real traffic rather than degrading.
2. No live copy that only Matthew can assert: `landing.ts` :67 :134 :145 :154 :155 :195, academy
   :95 :229 :238 — the inventory is `docs/matthew-story-intake.md` (email-followup's branch, C1–C6).
3. No promise that isn't built: academy "you can leave any time" with no unsubscribe (opt-in audit).
4. Booking-confirmation email must not say "30-minute" or link a dead Calendly handle
   (`convex/emails.ts:200-206`; fallback fixed on email-followup's branch, REPORTED).

## 2. The funnel as built (current stage: ~0 real visitors)

Path A (assessment-led, the homepage's design): `/` splash → "Start Now" → "Assess where you are
now" → optional account gate (all three choices reach the assessment) → 5-question Claude chat
(≤2 follow-ups each) → recap confirm → email given (lead + assessment rows written; report emailed
async) → report view → "Book an intro call" → `/book` prefilled Calendly, 15-min event.
Path B (direct): nav "Book a Call" on every page → `/consulting#booking` Calendly, no prefill.
Nothing on either path is behind Clerk (`src/middleware.ts` gates only `/admin/*`).

Functional constraints **at this stage** (things that would bite the first 50 real visitors):
| constraint | evidence | effect | owner |
|---|---|---|---|
| Clerk dev keys | R-003 | account gate / report claim fail under load | matthew |
| Convex deployment is dev-tier | R-012 (`reported`) | no capacity guarantee for every funnel write | matthew |
| Only conversion path on `/` is a 5-question AI chat | `AssessmentGate.tsx:49-66`, `DiscoveryAssessment.tsx` | high-commitment first ask; no email-only option on `/`, `/consulting`, `/book` (opt-in audit) | cmo → offer |
| No app-level rate limit on the chat route | `src/app/api/agent/discovery/chat/route.ts` has no `rateLimit` call; only `emailCapture` 3/hr guards the final submit | a bot or a curious visitor drives unbounded Anthropic spend | sdm / dev-N (ask-first: route change) |
| No timeout on the Anthropic stream call | `route.ts:203-217` (UNVERIFIED whether the platform bounds it) | hung turns look like a broken site | sdm / dev-N |
| `/consulting` copy says 30-minute; live event is 15-min | `consulting/page.tsx:26` comment, R-001 | trust hit at the moment of booking | offer (copy) |

Constraints **at the next stage** (warm network + four content pillars; call it 200–1,000
visitors/month, tens of assessments):
| constraint | why it appears at that volume | owner |
|---|---|---|
| Single Calendly event, single human | every path ends on Matthew's calendar; capacity per offer (REPORTED: 3 consulting slots/wk, 2 DFY/mo) is the real cap, and nothing on the site reflects it or queues past it | matthew (capacity numbers) → cmo (copy) |
| Assessment degrades silently to non-AI under Anthropic failure | `degrade()` `route.ts:182-193` is a designed fallback; at volume, an outage turns the whole top of funnel into a scripted form with only a `degraded` flag on one event | obsv: alert on `degraded=true` rate |
| No blog / content landing surface | R-013; the four pillars are the inbound plan and have no page to send people to | cmo brief (M4) → sdm |
| No nurture consent / unsubscribe | opt-in audit D3; email-followup Phase 2 | matthew (D3) → email-followup |
| Report email delivery failures are a doc field, not an event | `internalSetError` `discoveryAssessments.ts:384-389`, no PostHog pair | silent lead loss at volume | business-intake |

## 3. Instrumentation, ranked (most important now → next)

Taxonomy `src/lib/analytics-events.ts`. `$pageview` is manual per route (`capture_pageview:false`,
`posthog.ts:27`; `PostHogProvider.tsx:13-22`). Discovery events are client-fired only.

| rank | step | event | state | gap / why it ranks here |
|---|---|---|---|---|
| 1 | Booking completed | `consultation_booked` — `CalendlyEmbed.tsx:91` on `calendly.event_scheduled` | wired, client-only, PostHog-only, **never received in 30d** | The one number the business runs on. Lost to tab-close or blockers; no Calendly webhook, no Convex row. Needs a server-side source of truth (Calendly webhook → Convex + PostHog server capture). Ask-first: new route. |
| 2 | Real-visitor arrival | `$pageview` by `$host` | works | Today it *is* the cutover detector: first `$pageview` with host `icodemybusiness.com` = cutover happened. Keep a saved insight on it. |
| 3 | Email given at assessment end | `discovery_assessment_completed` (client) + server `lead_captured` only on the Top-3 route | client-only for the discovery path; `lead_captured` 1 in 30d | The lead is the asset; capture it server-side in the `submit` mutation path so it survives the tab. |
| 4 | Recap reached / confirmed | `discovery_stage_advanced{stage:5}` / `discovery_recap_confirmed` | confirm never received; entry is inferred from a stage breakdown | business-intake asked to verify wiring and add a distinct recap-shown event (`ac20cfb` in flight). |
| 5 | Assessment start + account choice | `assessment_started`, `assessment_account_choice` | fine | Already answers "does the gate cost us people" once n exists. |
| 6 | Splash → main | `splash_entered` | one day old (`068dc8e`) | Earliest drop-off point; nothing to say until ~100 real arrivals. |
| 7 | Report email delivered / failed | none (doc fields `emailSent`, `internalSetError`) | missing | At volume this is silent lead loss; pair the error path with an `api_error`-class event. |
| 8 | Degraded-mode rate | `degraded` prop on `discovery_stage_advanced` | present as a property, no alert | Turn into a PostHog alert once traffic exists. |
| 9 | `/book`, `/consulting` arrival, Calendly iframe shown | `$pageview` only; `book_call_clicked` is intent | acceptable for now | Add `calendly_embed_viewed` only if #1 shows a click→booked gap worth explaining. |

## 4. Trust gaps and decision triggers in the copy
_(filled from the copy audit — see §4 below once landed)_

## 5. What was delegated this pass
| to | what | state |
|---|---|---|
| business-intake | verify `discovery_recap_confirmed` wiring; distinct recap-shown event on `ac20cfb` | sent 09-04 11:05 |
| email-followup | fix dead Calendly fallback (done, REPORTED); "In your own words" framing line (given); consent gate raised to Matthew as D3 prerequisite | sent 09-04 |
| offer | (pending copy audit) top trust gaps on the letter + `/consulting` 30-min line | — |
| Matthew | R-002 cutover, R-003 Clerk keys, D3 consent, C1–C6 claims (story-intake) | board |
