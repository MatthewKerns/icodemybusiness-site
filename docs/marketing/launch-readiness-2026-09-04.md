# Launch readiness — icodemybusiness.com cutover — 2026-09-04 (cmo)

Matthew asked: the by-host tile needs its fourth entry, `icodemybusiness.com`; how close are we;
what are the risks. Plan approved 09-04 (`~/.claude/plans/refactored-forging-otter.md`).

**State (VERIFIED 09-04 13:20):** `dig icodemybusiness.com` → 185.199.108–111.153 (GitHub Pages);
`www` → matthewkerns.github.io; the apex serves "Internal Design Portfolio (Static Mockups)".
`staging.icodemybusiness.com` → 2.25.207.149 already. DNS is at Namecheap, not Hostinger, so no
agent tooling can move it (ROADMAP R-002).

## How close
**Two decisions of Matthew's plus one ~15-minute mechanical deploy. Not blocked on code.**
(Deploy session's independent read, VERIFIED from ROADMAP + DEPLOY.md, 09-04.) Matthew deferred
DNS himself on 09-02 to do it with R-003, because a Clerk production instance is domain-bound.

| # | step | owner | state |
|---|---|---|---|
| 1 | Merge pending branches to `main` (cmo `agent/cmo/team-protocol` @ bce734d gated green; intake `ac20cfb`, email-followup `18ed3fd` are their leads' calls) | Matthew | deploy reports approval to merge cmo (REPORTED) |
| 2 | Clerk production instance bound to the apex; live keys in the VPS build env; rebuild (R-003) | Matthew → deploy | keys not in hand |
| 3 | Namecheap: `@` A → 2.25.207.149 (drop the four GitHub IPs); `www` CNAME → icodemybusiness.com; leave `staging` | Matthew | blocked on him (R-002) |
| 4 | Same change: delete `CNAME` + `.github/workflows/deploy-apex.yml` (before DNS moves) | deploy | ready |
| 5 | VPS: app URL env → https://icodemybusiness.com, rebuild, `./deploy.sh cutover` (Traefik cert on first hit) | deploy | ready; nothing pre-staged (REPORTED) |
| 6 | Smoke the apex; check Google Safe Browsing the same day | deploy + Matthew | after 5 |

Without step 2 the funnel still works (guest assessment → email → book needs no Clerk) but
sign-in and `/admin/*` run under dev-key caps.

## Risks, ranked by cost if they bite
1. **Safe Browsing re-flag** — the reason the placeholder exists. Mitigations already true: no prices,
   no payment collection. Check the status the day of cutover.
2. **Clerk dev keys under real traffic (R-003)** — hard caps; sign-in and report-claim fail outright.
   Core path unaffected; `/admin/*` and the funnel map need it. Same sitting as DNS.
3. **Unbounded Anthropic spend on the discovery chat** — no per-session rate limit, no stream timeout
   in `src/app/api/agent/discovery/chat/route.ts`; only the final submit is limited (3/hr).
   Board M11 (ask-first: route change). Blocker before content or paid traffic, not before warm network.
4. **Live copy only Matthew can assert** — `landing.ts` :67 :134 :145 :154 :155 :195, `/services:241`,
   academy :95, `/consulting` "2–3 hours" / "30-day" ×3. Inventory: `docs/matthew-story-intake.md`
   C1–C8 (email-followup's branch). Credibility risk with exactly the right readers; not legal.
5. **Promises not built** — `/academy` "leave any time" with no unsubscribe; nurture sequence has no
   consent record (Matthew ruled strict). Launch is fine **if no sequence sends** until consent lands.
6. **Dev-tier Convex (R-012)** — no capacity guarantee; promotion is its own task with a data decision.
   Fine for the first hundreds of visitors; schedule it.
7. **Booking invisible server-side** — `consultation_booked` is a client-side iframe message to PostHog
   only. Calendly's dashboard is the truth for now. Board M12 (ask-first: webhook route).
8. **Voice widget throws on every page (R-004)** — set Retell keys or unmount before launch.
9. **Unverified sign-in round-trip (R-016)** — five minutes of Matthew's clicking on staging.
10. **`_legacy/` carries an old hourly price and dead Calendly handles** — not served; delete or archive so a
    future no-price audit doesn't misreport it.

Not risks: `/consulting` "30-minute" (fixed, gated green on the cmo branch); the dead Calendly
fallback in the booking email (fixed on email-followup's branch).

## Recommendation (board D7)
**Go** when steps 1–5 happen in one sitting, with risks 1, 2 and 8 handled in that sitting and
risk 5 held. Risks 3, 6, 7 are the first post-launch tickets, in that order. The point of launching
now: the PostHog "Key constraint" tile can only move off TRAFFIC once real visitors exist.

## Verification after cutover
- `dig +short icodemybusiness.com` → 2.25.207.149; `curl -sI https://icodemybusiness.com` → not GitHub; the site's title.
- PostHog dashboard 933266: by-host tile gains `icodemybusiness.com`; constraint tile reads TRAFFIC until 50 apex views, then names a step.
- Console on the apex: no Clerk dev-key warning, no Retell errors.
- `/admin/funnel` opens for an @icodemybusiness.com login only.
- Google Safe Browsing status: clean.

## Claims
| claim | label | source |
|---|---|---|
| DNS / apex state | VERIFIED | `dig`, `curl` run by cmo 09-04 13:20 |
| remaining steps + "not blocked on code" | VERIFIED by deploy from docs; REPORTED to cmo | deploy message 09-04 |
| Clerk keys not in hand; nothing pre-staged on VPS | REPORTED | deploy 09-04 |
| Matthew deferred DNS on 09-02 for R-003 | REPORTED | deploy 09-04; consistent with R-002 text |
| chat route has no rate limit / timeout | VERIFIED | funnel audit 09-04, `route.ts` |
