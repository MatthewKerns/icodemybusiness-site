# Roadmap — icodemybusiness.com

Single source of truth for what's wrong, what's next, and who can pick it up.
Every entry is a **work order**: enough context that an agent (or Matthew) can
start it cold, verify it, and ship it without asking a question first.

- **How to work an item:** [§ Working an item](#working-an-item)
- **How to reprioritise:** [§ Reprioritising](#reprioritising)
- **Deploy mechanics:** [docs/RUNBOOK.md](./RUNBOOK.md), [CLAUDE.md § Deployment](../CLAUDE.md)
- **Related planning:** [content/](../content/README.md) (YouTube→blog funnel),
  [offers/](../offers/consulting.md) (internal rate card), [.feature-factory/](../.feature-factory/)

**Last swept:** 2026-09-02 · **Live at:** https://staging.icodemybusiness.com

---

## Status & evidence conventions

| Field | Values |
|---|---|
| `status` | `blocked` · `ready` · `in-progress` · `verify` · `done` |
| `priority` | `P0` funnel-breaking · `P1` goal-critical · `P2` quality/measurement · `P3` growth |
| `owner` | `matthew` (needs a human/account action) · `agent` (any harness session) |
| `evidence` | `verified` (checked this repo/prod directly) · `reported` (secondhand) · `assumed` |

Never promote an `assumed` item to `verified` without re-checking it. If a
verification command in here stops reproducing the problem, mark it `done` and
say what changed — do not silently delete the row.

---

## P0 — Funnel-breaking

These are live defects between a visitor and a booked call. Nothing in P1 matters
while any of these is open.

### R-001 · No 15-minute Calendly event exists

`status: blocked` · `owner: matthew` · `evidence: verified`

Every CTA on the site promises a **free 15-minute intro call**. Matthew's Calendly
profile exposes exactly one bookable event type — `new-meeting` ("New Meeting").
There is no 15-minute event. The `30min` slug that the site used to point at was
**deactivated**, not deleted.

**Why it matters:** this is the destination of the entire sales letter. A visitor
who does everything right lands on a generic meeting booking.

**Trap:** `https://calendly.com/12kernsmatthew/30min` still returns **HTTP 200**, so a
status-code check calls it healthy. It serves a bare SPA shell with no `og:` metadata,
and Calendly's lookup reports `unavailability_reason=event_type_deactivated`. Compare
against `/new-meeting`, which carries `og:title` "New Meeting - Matthew Kerns".

**Verify:**

```bash
curl -sS https://calendly.com/api/booking/profiles/12kernsmatthew/event_types | python3 -m json.tool
```

The profile listing only returns *active* types, so a deactivated event is invisible here.

**Done when:** that call returns a 15-minute event, its slug is set as
`NEXT_PUBLIC_CALENDLY_INTRO_URL` on the VPS, and `/book` embeds it.

**Matthew's action:** create the event type in Calendly. Everything downstream is config.

**Update 2026-09-02:** Matthew supplied `https://calendly.com/12kernsmatthew/new-meeting-1`
("Introduction Call"). The profile listing now returns only that event, so the old
`new-meeting` default was pointing at a deactivated one. `new-meeting-1` is now the
in-code default in `src/app/book/page.tsx`; setting `NEXT_PUBLIC_CALENDLY_INTRO_URL`
to the same value on the VPS makes the override explicit. Remaining: reconcile
`offers/consulting.md`'s `matthewkerns/discovery` handle.

**Also inconsistent:** [offers/consulting.md](../offers/consulting.md) advertises a
*third* URL — `calendly.com/matthewkerns/discovery` (a different account handle). Pick
one handle and reconcile all three.

---

### R-002 · Apex domain still serves the GitHub Pages placeholder

`status: blocked` · `owner: matthew` · `evidence: verified`

`icodemybusiness.com` resolves to GitHub Pages (`185.199.109.153`) and serves the
old static "Internal design portfolio" page. The real app is only on
`staging.icodemybusiness.com`.

**Verify:** `curl -sS -o /dev/null -w '%{remote_ip}\n' https://icodemybusiness.com`
→ a `185.199.*` address means still on Pages.

**Done when:** apex `A` → `2.25.207.149`, `www` CNAME → `icodemybusiness.com`
(Namecheap — no API credentials available, dashboard only), then `./deploy.sh cutover`.

**Sequencing trap:** retire `CNAME` + `.github/workflows/deploy-apex.yml` in the
**same change** as the cutover. Removing them earlier unpublishes the custom domain
on GitHub's side and the apex 404s until DNS moves.

**After cutover:** check Google Safe Browsing status for the domain. The apex was
previously flagged; that history is why the static placeholder exists at all.

---

### R-003 · Clerk is running development keys in production

`status: ready` · `owner: matthew` · `evidence: verified`

The live bundle ships `pk_test_…` and the browser console warns on every page load:
*"Clerk has been loaded with development keys… should not be used when deploying
your application to production."* Dev instances carry strict usage limits — sign-in
will start failing under real traffic rather than degrading gracefully.

**Verify:** load the site, check the console for the Clerk development-keys warning.

**Done when:** a Clerk production instance exists, its live keys are configured on the
VPS, and the warning is gone from a fresh build.

**Couples with R-002:** a Clerk production instance is domain-bound, so provision it
against the final apex rather than doing this twice.

---

### R-004 · Voice agent is dead on every page

`status: blocked` · `owner: matthew` · `evidence: verified`

The Retell public key and agent ID are unset on the VPS, so the widget mounts and then
throws. Two console errors on every page load: *"Retell public key or agent ID not
configured"* → *"Retell chat widget failed to load"*.

**Verify:** browser console on any page.

**Done when:** both keys are configured, rebuilt, and the widget connects.

**Ship-independently option (`owner: agent`):** if the voice agent isn't coming back
soon, stop *mounting* the widget when the keys are absent, so visitors don't get a
broken control. That fix needs no secrets and can land before Matthew supplies keys.

---

## P1 — The landing page

Goal: a simple, luxury, single-scroll sales letter with Matthew on a VSL, continuous
CTAs, and storytelling — no visible prices, but unmistakably a tens-of-thousands
engagement. Lands on the free intro call.

### R-005 · Single-scroll VSL sales letter at `/`

`status: done` · `owner: agent` · `evidence: verified`

**Shipped `69a2ea7`** and verified on staging 2026-09-02, independently by two
sessions: all seven beats present in the rendered text, 4 CTAs → `/book`, zero
visible currency amounts, and the four path cards stack to one column at 375px
with no horizontal overflow (`scrollWidth === innerWidth === 375`).

One false positive worth remembering: grepping the raw HTML for `$[0-9]` finds
`$12` and `$16`. Those are Next.js RSC module reference ids, not prices — check
`document.body.innerText`, not the HTML source, when verifying the no-price rule.

`/` was a component collage — a hero fork, three generic story blocks, an offer
grid, a workflows explainer, a chat demo and a community banner — that read as a
services directory. It is now one letter, in this order:

> splash → promise + VSL → one action (assess) → the assessment → problem →
> who I am → which path is you → objections → guarantee → close

A CTA to the intro call recurs after each beat rather than only at the end, each
carrying a `placement` prop so we can see which beat earns the click.

**Constraints held:** no visible prices (R-009); no hardcoded call durations while
R-001 is open, so the copy says "intro call"; all copy in
[src/content/landing.ts](../src/content/landing.ts) so rewording is a content edit.

**Built across:** `c452ac9` (splash restaged on the payoff line with a real CTA
affordance), `e158295` (single assessment CTA replacing the post-splash menu),
`69a2ea7` (the letter body).

**Remaining to verify in prod:** every CTA resolves to `/book`, zero currency
amounts in the HTML, and the path cards stack cleanly at 375px.

---

### R-006 · VSL video slot

`status: blocked` · `owner: matthew` · `evidence: verified`

Not recorded yet — confirmed with Matthew 2026-09-02. `public/` contains no video assets.

**Design:** the player reads a single config constant, so the letter ships and
converts without the video and dropping it in later is a one-line change. Keep the
asset URL **in code/config, not an environment variable** — it isn't a secret, and a
new public env var costs a Dockerfile `ARG`+`ENV`, a `--build-arg` in `deploy.sh`, and
a value on the VPS. Three moving parts for a URL that can live in the repo.

**Slot shipped `69a2ea7`, restaged `ada7f3b`.** `VSL` in
[src/content/landing.ts](../src/content/landing.ts) takes `src` + `kind`
(`youtube` | `vimeo` | `file`). Setting `src` publishes the video.

The video-led design now lives at its own route, **`/vsl`** — same page, same
copy, `VideoHero` instead of `DiagramHero`. Both routes share
`src/components/landing/letter/LandingPage.tsx`, so they cannot drift as copy
changes; the difference between them is one JSX node.

**Promoting it is two lines** in `src/app/page.tsx` (`surface="video"`,
`hero={<VideoHero />}`), then delete `src/app/vsl/page.tsx`. No content moves.
The `surface` analytics dimension is named for the hero rather than the route
precisely so events stay coherent across that promotion.

**Done when:** Matthew supplies the recording and hosting choice; the slot renders
it with a poster frame and no autoplay.

---

### R-007 · Present all four engagement paths, not one offer

`status: done` · `owner: agent` · `evidence: verified`

**Closed by `69a2ea7`.** The "Which one is you?" section presents diagnose /
have it built / bring me inside / rebuild how it runs, each with its timeline and
depth of commitment, all four terminating at the same intro call. Copy in
[src/content/landing.ts](../src/content/landing.ts) `PATHS`.

Matthew's direction (2026-09-02): speak to **all** of done-for-you build, fractional
partner, transformation program, and diagnostic-first — as routes a new client can
take, covering how each fits, what it suits, and typical timelines. The reader should
be sold on Matthew's expertise by the way the paths are laid out, before any offer lands.

**Done when:** the section presents four routes with a "which one is you" framing and
every route terminates at the same free intro call.

---

### R-008 · Objection handling inline in the letter

`status: done` · `owner: agent` · `evidence: verified`

**Closed by `69a2ea7`.** Five objections answered in the letter body, including
the cost question answered directly rather than dodged. Copy in
[src/content/landing.ts](../src/content/landing.ts) `OBJECTIONS`.

Long-form VSL practice: answer objections where they arise, not only in a trailing
FAQ. Source material already exists in the `/book` and `/consulting` FAQ items.

**Register note:** "no pitch, no pressure, no obligation" was removed at Matthew's
request (2026-09-02) — it reads as reassurance that undercuts premium positioning.
Don't reintroduce that register when writing objection copy. The `/book` gold pill
still reads "Free · 15 minutes · No obligation" — same family, awaiting Matthew's call.

---

### R-009 · Signal the price tier without printing a price

`status: done` · `owner: agent` · `evidence: verified`

**Closed by `69a2ea7`.** No number appears on the letter; the tier is carried by
scope, capacity language ("very few of these at once", "a handful a year") and a
direct answer to the cost objection. Keep the zero-price check in the deploy
verification so this can't regress silently.

Standing decision (2026-09-02): **no visible pricing anywhere.** `/subscribe`
redirects to `/consulting`; the Stripe stack stays in-repo but dormant and unlinked.

The letter must still make it obvious this is a tens-of-thousands engagement — via
scope, deliverables, engagement length, and the calibre of who it's for. The internal
rate card in [offers/consulting.md](../offers/consulting.md) is the reality to signal
toward. It is **internal only** and must never surface on the site.

---

## P2 — Measurement & correctness

### R-010 · Clerk sign-ins never reach the `users` table

`status: ready` · `owner: agent` · `evidence: verified`

`users` has **0 rows**, yet the row in `leads` carries a real `clerkUserId`
(`user_3BM9…`) — so someone authenticated and no user record was written.
`useEnsureUser` is mounted in `Providers`; the write path needs tracing.

**Verify:** `npx convex data users --limit 5` → currently empty.

---

### R-011 · Almost nothing is instrumented

`status: ready` · `owner: agent` · `evidence: verified`

`pageViews` has 315 rows and the pipeline demonstrably works (a page load writes a
row within seconds). But `visitorEvents` has only **4** rows — the durable
click/decision log is nearly empty because few controls call `useTrackEvent`.

**Correction on record:** an earlier sweep reported these tables as *empty*. That was a
bad `grep` against the Convex CLI's table output, not a real finding. The pipeline is
healthy; the gap is instrumentation coverage.

**Done when:** every CTA on the new letter emits a Tier-1 event per
[src/lib/analytics-events.ts](../src/lib/analytics-events.ts) — never a hardcoded
event-name string.

**Test data warning:** the `leads` table contains deliberate `staging-email-test`
rows (addresses `kerns@inventoryhero.ai`, `support@infinityvaultcards.com`) created
while testing welcome-email delivery. Exclude them from any lead reporting.

---

### R-012 · Backends are still dev-tier

`status: ready` · `owner: matthew` · `evidence: reported`

Convex is on the **dev** deployment `neat-hamster-414`; Clerk is on test keys (R-003).
Functional, not production-grade. Promoting Convex to a prod deployment is its own task
with its own env plumbing and a data decision — the 315 `pageViews` and 68
`agentSessions` rows live in dev.

---

## P3 — Growth

### R-013 · No blog route exists

`status: ready` · `owner: agent` · `evidence: verified`

[content/README.md](../content/README.md) plans an idea → YouTube → blog-post funnel
across four pillars, and states plainly that there is no blog route or CMS content
model in the app yet. The YouTube content is the top of the funnel feeding this
letter, so the missing landing surface is a real gap.

### R-014 · Testimonials page is an unverified draft

`status: blocked` · `owner: matthew` · `evidence: verified`

`/testimonials` 404s by design unless the draft flag is enabled. The quotes are
**aspirational drafts, not real client statements** — publishing them as genuine would
be fabricated proof. Needs real, consented quotes before the gate comes off. The
letter's proof section (R-005) must not depend on this.

---

### R-015 · Decide what happens to the five orphaned components

`status: ready` · `owner: matthew` · `evidence: verified`

The letter rebuild (`69a2ea7`) left five components built but unreferenced:
`OfferGrid`, `AgentWorkflowsBlock`, `AgentSection`, `StoryBlock`,
`HeroAuroraBackground`. They were deliberately **not** deleted — whether any of
them earns a place back in the letter is a product decision, not a cleanup.

**Verify:** `for c in OfferGrid AgentWorkflowsBlock AgentSection StoryBlock HeroAuroraBackground; do grep -rl "$c" src/ | grep -v "/$c.tsx"; done`

**Watch out:** `AgentSection` is the Retell widget. With it off the homepage, the
R-004 console errors no longer appear on `/` — a quiet console there says nothing
about whether the voice agent works. Check another page that mounts it.

**Done when:** each of the five is either reintroduced into the letter or deleted
with its test and asset references.

**Added 2026-09-02:** the Discovery Assessment (R-017) replaces `Top3IssuesAgent`
at `#top3`, so `src/components/agent/top3issues/*`, `src/lib/agent/top3-prompt.ts`,
`src/app/api/agent/top3/*` and `src/emails/Top3IssuesSummaryEmail.tsx` join this
list. Still referenced from `/consulting` copy only by anchor (`/#top3`), which
now opens the new assessment. Not deleted for the same reason as the others.

---

### R-016 · Assessment gate's sign-in round-trip is unverified in prod

`status: blocked` · `owner: matthew` · `evidence: verified`

**Partly verified 2026-09-02.** What was confirmed on staging: the gate opens,
both links carry `redirect_url=https://staging.icodemybusiness.com/#top3`
correctly encoded, `/sign-up` loads Clerk's form with the parameter preserved,
and the guest door scrolls to the assessment (96px offset, matching
`scroll-mt-24`).

**Why it's blocked rather than done:** completing a sign-up means creating an
account, which an agent must not do. The last leg — finish Clerk and confirm you
land back on `/#top3` rather than the top of the page or a Clerk-hosted URL — has
to be clicked by a person.

The optional account gate sends visitors to `/sign-up` and `/sign-in` with a
`redirect_url` back to `/#top3`. That round-trip has been reasoned about but not
exercised against a real build, and Clerk is still on development keys (R-003),
which is exactly the condition most likely to make it behave differently in prod
than locally.

**Verify:** on staging, click "Assess where you are now" → "Create a free
account", complete Clerk, and confirm you land back on `/` scrolled to the
assessment rather than at the top of the page or on a Clerk-hosted URL.

**Done when:** both doors return the visitor to the assessment, and the guest door
scrolls there without a page load.

---

### R-017 · Discovery Assessment — two legs an agent cannot verify

`status: in-progress` · `owner: matthew` · `evidence: verified`

**Shipped (working tree, 2026-09-02).** The five-question discovery intake
(`src/content/discovery-questions.ts`, generalised from the ecommerce
`5-questions-framework.md`) replaces the freeform Top 3 chat at `/#top3` and is
also served at `/assessment`. The UI asks each anchor question; Claude drills
down at most twice per question (server-clamped in
`src/lib/agent/discovery-prompt.ts`); a recap in the visitor's words is
confirmed; `convex/discoveryAssessments.submit` captures the lead and schedules
`convex/discoveryProcessor.finalizeAssessment`, which writes the visitor summary
+ the admin-only brief and sends the report email (audited in `emailSends`).
The whole flow completes with Anthropic unavailable: each turn degrades to the
visitor's verbatim answer and the processor falls back to a verbatim summary.

**Verified by tests:** stage clamp + forced completion; brief never in a public
or portal query; claim binds only the verified identity; fallback path still
reaches `ready`; failed sends are audited and not marked sent.

**Not verifiable by an agent — Matthew's clicks:**

1. **Sign-up round-trip from the result screen** (same family as R-016, still on
   Clerk dev keys): click "Create a free account to keep this report", finish
   Clerk, confirm you land back on `/assessment` or `/#top3` with the report
   shown as "Saved to your account", and that `/portal/assessments` lists it.
2. **A real Calendly booking from the result screen:** confirm the invitee
   record in Calendly carries `utm_content=assessment:<sessionId>` and the
   prefilled email/name, so a booking can be matched to its report in
   `/admin/assessments`.

**Also confirm before trusting real output:** `ANTHROPIC_API_KEY` and
`RESEND_API_KEY` are set on the Convex deployment (`neat-hamster-414`); without
the first, every report is the verbatim fallback with `processingError` set.

**Known gap, deliberate:** an unfinished assessment does not follow the account
across devices (the session id lives in `sessionStorage`; `agentSessions` has no
`clerkUserId`). The gate copy was narrowed to match (`1a2e011`).

---

### R-018 · Nothing gates a merge to main

`status: ready` · `owner: matthew` · `evidence: verified`

GitHub Actions is locked on billing, so CI enforces nothing. Every "verified"
claim made today — including all of mine — is a session's word that it ran lint,
tsc and tests by hand, not a gate that would have stopped a bad merge.

The clean-export deploy script (`scripts/deploy-staging.sh`, `docs/DEPLOY.md`)
closed the worst hole: builds now come from a `git archive` of a pushed commit
rather than the shared working tree, so uncommitted work can't ride along. What
remains unguarded is the merge itself.

**Verify:** `gh run list --limit 5` — currently returns nothing runnable.

**Done when:** either billing is restored and the workflow gates merges to main,
or the team accepts hand-verification explicitly and writes that down, so nobody
later mistakes an unenforced convention for a passing pipeline.

---

### R-019 · The homepage headline promises three things; the assessment finds one

`status: blocked` · `owner: matthew` · `evidence: verified`

`VSL.headline` reads *"Most businesses don't need more software. They need the
right three things fixed."* The discovery assessment traces **one** problem
through five questions. The gate copy and `PATHS[diagnostic].what` were corrected
to match the flow (`07cb539`); the headline deliberately was not, because it is
the letter's positioning rather than a description of the assessment.

They now sit on the same page saying different numbers.

**Done when:** Matthew either moves the headline to single-problem framing or
confirms it stands as positioning. Not an agent's call — it's the page's central
promise.

---

## Working an item

1. **Claim it** — set `status: in-progress` in this file and commit that alone, so
   parallel sessions don't collide. Multiple Claude sessions share this working tree,
   and edits have been swept into another session's commit before.
2. **Read the linked evidence** before trusting the description. Re-run the verify
   command; if it no longer reproduces, say so rather than building on a stale premise.
3. **Build**, matching the surrounding code's idiom.
4. **Verify locally:** `npx tsc --noEmit` and `npx next lint`. Narrow tests only — a
   full suite belongs on the VPS, not this laptop.
5. **Ship:** commit, push, then

   ```bash
   rsync -az --delete <subdir>/ root@2.25.207.149:/opt/icodemybusiness-site/<subdir>/
   ssh root@2.25.207.149 'cd /opt/icodemybusiness-site && ./deploy.sh build && ./deploy.sh staging'
   ```

   Use `./deploy.sh staging` — **never** `run`, which re-exposes the dead hstgr host
   and drops staging. Never blanket `--delete` the VPS root: it holds VPS-only deploy
   and configuration files that are not in this repo.
6. **Verify in prod** with curl or a browser against `staging.icodemybusiness.com`.
   Deploying is not shipping; confirm the change is actually served.
7. **Close it** — `status: done`, with one line on what changed and how it was verified.

**Announce before deploying.** Other sessions deploy to the same VPS, and concurrent
`deploy.sh` runs collide.

## Reprioritising

Priorities are a `priority:` field, not document order — change the field and move the
row. The rule that governs order: **P0 items sit between a visitor and a booked call**,
so they outrank everything, including the landing page rebuild. An item only leaves P0
when it no longer breaks the funnel.

When adding an item, give it the next `R-0NN`, a verify command, and a `done when`.
An entry without a verification path isn't a work order, it's a wish.
