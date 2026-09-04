# Copy trust-gap + decision-trigger audit — 2026-09-04

Produced by a read-only Sonnet subagent for the cmo session, tree `agent/cmo/team-protocol` @ 23b9758.
Definitions: **trust gap** = the copy asks the reader to believe something they cannot verify from the
page, or asserts a business fact only Matthew may assert (CLAIM-NEEDED). **Decision trigger** = the
evidence or moment that moves the reader from interested to acting.

## Ranked top-5 gaps most likely costing booked calls
1. **`/consulting` says 30-minute call, the live event is 15 min** — `ConsultingHero.tsx:8,18,32`,
   `consulting/page.tsx:202`. The one promise a visitor tests at the moment of booking. (Fixed on
   the cmo branch this pass, pending Matthew's OK.)
2. **Homepage capacity claims still live** — `landing.ts:145` "I hold very few of these at once",
   `:155` "A handful a year". The exact incident copy-principles §2 was written for. With `offer`
   and Matthew (story-intake C1/C4).
3. **`/consulting` "2–3 hours research" / "30-day follow-up" repeated 3×** — `consulting/page.tsx:33,56`,
   `BonusStack.tsx:16,32-34`; also `services/page.tsx:183`. [CLAIM NEEDED: hours; follow-up window.]
4. **Splash carries no specificity** — `SplashScreen.tsx:75,86` "Save time. Make money. / Make a
   Difference." First screen, zero trigger. One concrete line from PROBLEM (`landing.ts:44`) would do.
5. **`/services` is process-as-subject with no proof** — `services/page.tsx:157-162,96-98` ("I write
   the architecture… review every line myself"), case studies gated off (`SHOW_CASE_STUDIES=false`,
   placeholder metrics behind the flag), no guarantee section.

## Per-surface findings

### Homepage letter — `src/content/landing.ts`
| line | sentence | type | sev | close it |
|---|---|---|---|---|
| 145 | "A monthly retainer, capacity-limited — I hold very few of these at once." | claim-needed | H | story-intake C1 |
| 155 | "The deepest engagement I offer. A handful a year." | claim-needed | H | contradicts paper plan 2/mo (REPORTED via offer); C4 |
| 134 | "Typically six to twelve weeks" | claim-needed | M | C4 |
| 61 | "Most consultants leave you with a slide deck and an invoice." | vague-outcome | L | cut or keep; unfalsifiable |
| 35–38 | "A short message from Matthew" with `VSL.src = null` | unverifiable-mechanism | L | R-006; confirm poster state doesn't overclaim |
**Trigger:** `PATHS.diagnostic` (:120–128) "five questions… you get the write-up whether or not we go further" — strong, risk-free, but mid-page (third beat). Readers who bounce after PROBLEM never see it. Pull the "free write-up regardless" line above the fold / onto the splash.

### `/consulting` — `page.tsx`, `ConsultingHero.tsx`, `BonusStack.tsx`
| line | sentence | type | sev | close it |
|---|---|---|---|---|
| Hero 8,18,32; page 202 | "Free 30-Minute Consultation" ×4 | promise-not-built | H | 15 min (R-001 verified) — done on cmo branch |
| page 33; Bonus 16 | "I spend 2-3 hours researching your business…" | claim-needed | H | [CLAIM NEEDED: hours] and say it once |
| Bonus 32–34; page 56 | "Direct access to me for 30 days after our session" | claim-needed | M | [CLAIM NEEDED: window] |
| page 39 | "you won't be charged for the session" | promise-not-built | M | implies a paid session; no pricing/charge exists (§4) |
| page 105 | "No surprises. No upsells." | proof-missing | L | §5 soothing register |
**Trigger:** the Measurable Progress Guarantee (:141–150) — concrete, risk-reversing — sits mid-page under three cards of unverified capacity claims. A one-line version in the hero next to the CTA would let it do the work.

### `/book` — `book/page.tsx`
| line | sentence | type | sev | close it |
|---|---|---|---|---|
| 63 | "most people leave with at least one idea" | claim-needed | M | [CLAIM NEEDED or cut] |
| 106 | "Free · 15 minutes · No obligation" | proof-missing | L | already "awaiting Matthew's call" in copy-principles §5 |
**Trigger:** assessment cross-link (:186–199) inside the booking section, at peak intent. Best placement on the site. Leave it.

### `/free-tools`
| line | sentence | type | sev |
|---|---|---|---|
| 26–31 | "Free AI tools that actually work." | vague-outcome | L |
The risk disclaimer (:119–136) is a good honesty note. **Trigger:** none toward a call by design; no link to the assessment or booking anywhere on the page — if this is a top-of-funnel source, that link is the missing trigger.

### `/services`
| line | sentence | type | sev | close it |
|---|---|---|---|---|
| 157–162 | "I write the architecture, use AI to build faster, and review every line myself" | process-not-outcome (§1) | M | rewrite around the reader's result |
| 96–98 | "I ask a lot of questions to help pinpoint…" | process-not-outcome | L | same |
| 183 | "…30 days of follow-up support included." | claim-needed | M | same claim as /consulting |
| 241 | "I take on a limited number of projects at a time." | claim-needed | H | board D4 |
| 22–65 | CASE_STUDIES block, `SHOW_CASE_STUDIES=false` | dormant | — | placeholder metrics; flipping the flag ships invented claims |
**Trigger:** none toward a call; only CTA is the email capture gated on "when I open new client spots". No proof between hero and capture.

### `/academy`
| line | sentence | type | sev | close it |
|---|---|---|---|---|
| 95 | "eight-plus years building software professionally" | claim-needed | M | story-intake |
| 238 | "No spam, and you can leave any time." | promise-not-built | L | unsubscribe: email-followup Phase 2 |
**Trigger:** FOR_YOU / NOT_FOR_YOU self-selection (:58–68) right before the join CTA. Works for a waitlist.

### `AssessmentGate.tsx`, `DiscoveryRecap.tsx`
No gaps. The gate's "your finished report is saved… so you can come back" (:141–145) is the corrected R-019 line; the recap's "You get it whether or not we ever work together" (:161) matches `landing.ts:123`. The recap playing the visitor's own words back is the strongest proof on the site.

### `SplashScreen.tsx`
| line | sentence | type | sev |
|---|---|---|---|
| 75, 86 | "Save time. Make money." / "Make a Difference." | vague-outcome | M |
**Trigger:** none. A pure gate. See ranked #4.

## Claims in this file
Every row is VERIFIED against the cited file:line by the subagent on this tree; "costing booked calls" rankings are INFERRED (n≈0 real visitors — see `funnel-baseline.md`).
