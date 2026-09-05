# Funnel baseline — pre-cutover, pre-recap-change — 2026-09-04 (cmo)

**CORRECTION 2026-09-05 — read this before the numbers.** R-002 is closed: the apex was cut over
and now serves the real site. And the cutover pointed `icodemybusiness.com` at the SAME container
that serves staging — one container, one Convex deployment, one dataset (VERIFIED by
`business-intake` 09-05; the VPS has exactly one `icodemybusiness-site` container). So the
staging/prod distinction below is not a distinction at all: what this file called "staging
traffic" is the same property now answering on the apex. Read every number as "the site's
traffic before the apex had a public address", not as "a different environment".

**Original note, kept for the record:** every number below is staging / localhost / VPS-hostname
traffic. Production (`icodemybusiness.com`) still serves the GitHub Pages placeholder
(ROADMAP R-002). There is no real-visitor funnel yet. This is a *pre-change* baseline: `business-intake`'s commit `ac20cfb`
(not on main) changes the Q1 anchor and the recap screen; when it deploys, treat any shift as the
change, not behaviour.

Source: PostHog project 206048 (EU). Window: last 30 days ending 2026-09-04 ~10:00 UTC.
Command: `execute-sql` — `SELECT event, count(), uniq(person_id), min(timestamp), max(timestamp)
FROM events WHERE timestamp >= now() - INTERVAL 30 DAY GROUP BY event` and the `$pageview` by
`$pathname`,`$host` variant. Independently reported by `business-intake` with identical totals.

## Events, 30d (VERIFIED)
| event | n | people | first seen | note |
|---|---|---|---|---|
| $pageview | 65 | 52 | 08-21 | autocapture on |
| $autocapture | 72 | 15 | 08-21 | |
| $pageleave | 25 | 25 | 08-26 | |
| discovery_stage_advanced | 6 | 2 | 09-02 | stage 5 (recap) reached once ever |
| assessment_started | 3 | 3 | 09-02 | |
| assessment_account_choice | 3 | 3 | 09-02 | |
| splash_entered | 1 | 1 | 09-04 | event shipped 09-04 (`068dc8e`) — one day of data |
| lead_captured | 1 | 1 | 09-02 | |
| book_call_clicked | 1 | 1 | 09-02 | click only; booking completion is not captured |
| api_error | 1 | 1 | 09-02 | |

`discovery_recap_confirmed`: never received — **but this is partly a wiring artefact, not a behavioural
finding.** For a guest (the default path) the event fires only when the email is submitted
(`DiscoveryAssessment.tsx:262` inside `onSubmit`; `DiscoveryRecap.confirm()` for guests just opens the
email form). The "Yes, that's right" click itself is unmeasured. So the one session that reached stage 5
may have accepted the recap and left at the email step; nothing would show it. (VERIFIED by
business-intake by grep, 09-04; `docs/observability.md` corrected in their `5dc2df1`.)

## Pageviews by path, 30d (VERIFIED)
| path | host | views | people |
|---|---|---|---|
| / | staging.icodemybusiness.com | 25 | 25 |
| / | localhost:3111 | 8 | 4 |
| / | icodemybusiness.srv1757482.hstgr.cloud | 8 | 8 |
| /book | staging | 6 | 5 |
| /academy | staging | 4 | 4 |
| /consulting | staging | 3 | 3 |
| /free-tools | staging (+1 hstgr) | 3 | 3 |
| /connect | staging | 2 | 2 |
| /services, /assessment, /sign-up, /mango | staging | 1 each | 1 each |

Zero pageviews from host `icodemybusiness.com`.

## What this says
- **n is too small for any drop-off narrative** (business-intake's caution, agreed). 52 "people" over
  30 days on staging, an unknown share of them Matthew and agent sessions.
- The splash gate has one day of instrumentation; nothing can be said about it yet.
- The homepage's only conversion path (assessment) has reached the recap once, ever; whether that
  visitor accepted the recap is unknowable from the data (see the note above).
- Booking is measured as a click on the way to Calendly, never as a booked event.

## Claims
| claim | label | source |
|---|---|---|
| all event counts / path counts | VERIFIED | the two queries above, run by cmo 09-04 |
| prod still serves the placeholder | VERIFIED (ROADMAP R-002, re-verified 09-02) + REPORTED (business-intake 09-04) | `docs/ROADMAP.md` R-002 |
| `discovery_recap_confirmed` never received, and fires only on email submit for guests | VERIFIED (event list) + VERIFIED-by-business-intake (grep, 09-04) | 30d event list; `DiscoveryAssessment.tsx:262`, `DiscoveryRecap.tsx` |
| `ac20cfb` changes Q1 + recap | REPORTED | business-intake 09-04 |
