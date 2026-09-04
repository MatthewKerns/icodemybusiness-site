# Story intake — Matthew

The email nurture sequence cannot be drafted without this file. Answer in plain
prose, in your own voice; nobody is going to publish your raw answers.

**Why this exists.** `docs/copy-principles.md` §2 says only you may assert a fact
about the business, because nine plausible agent-invented claims reached the live
homepage on 2026-09-02. Emails #2 and #3 of the sequence are *structurally* your
backstory and your epiphany (`docs/dotcom-secrets-notes.md`, Secret #7). There is
nothing in this repo to write them from. An agent that tried would be inventing
your life.

**How it is used.** An agent drafts from these answers only, and every drafted
sentence must cite the answer it came from. Anything you leave blank stays blank
in the email — it does not get filled in with something plausible.

**Status legend:** `BLOCKING` — no email can ship without it. `GATES` — one
specific email waits on it. `LIVE` — a claim already on the site that needs your
ruling either way.

---

## Group A — the backstory (email #2) · BLOCKING

Email #2 opens at the highest-tension moment and *ends at the wall*, unresolved.
That is the form; the loop is what pulls a reader to email #3.

- **A1.** Describe the single highest-tension moment in your working life that is
  causally connected to why you build software for businesses. Write it as a
  **scene**, not a summary: where you were, roughly what time of day, what was on
  the screen, who else it affected.
- **A2.** What was actually at risk in that moment — money, a job, a client, a
  relationship, your health? Name the concrete stake.
- **A3.** The five to eight steps that led there, in order, with rough dates or
  ages. This is the backfill that comes after the opening scene.
- **A4.** What did you believe at the time that turned out to be wrong?
- **A5.** **The wall.** What did you try that failed, and when did you know you
  were out of options? Email #2 ends here. Do not resolve it — that is email #3.
- **A6.** Who else is in this story? Which names or companies may be published,
  and which must be anonymised ("a wholesaler in the Midwest")?
- **A7.** Redaction list: what are you *not* willing to have in writing to
  strangers?
- **A8.** *(Secret #6 — character flaws.)* Two things you got wrong, were bad at,
  or still are. Which may be published? Brunson's argument is that a flawless
  character does not connect — but this is your call, not the framework's.
- **A9.** Is this the same story for the consulting audience and the academy
  audience? If they need different backstories, give both.

## Group B — the epiphany (email #3) · BLOCKING

- **B1.** What was the insight that got you off the wall? One sentence, as you'd
  say it out loud.
- **B2.** What triggered it — a person, a book, a project, an offhand comment?
  Give the scene.
- **B3.** What did you do differently the very next day?
- **B4.** What was the first result of applying it — and can you state that
  result publicly and defend it if a prospect challenges it? If not, we say
  nothing.
- **B5.** What do you want the reader to believe is possible that they don't
  believe now?
- **B6.** Email #3 branches on the path the assessment recommended. One sentence
  each on how the insight lands for `diagnostic`, `build`, `fractional`,
  `program` (`src/content/landing.ts:120–156`).

## Group C — capacity, timelines, standards · BLOCKING (and one LIVE)

- **C1.** `LIVE` — `src/content/landing.ts:145` reads *"A monthly retainer,
  capacity-limited — I hold very few of these at once."* `docs/copy-principles.md`
  §2 names **that exact phrase** as one of the nine agent-invented claims, and
  `git log -S` shows it still traces to `69a2ea7`, the original agent-authored
  letter — remediation commit `24cfa65` replaced only two claims. **It is on your
  homepage right now.** Confirm it, replace it, or delete it.
- **C2.** How many engagements can you actually hold at once today? Will you put
  a number in writing?
- **C3.** `GATES email #5` — Is there any **real** deadline in the next 30 days:
  a cohort date, a capacity cutoff, a rate change, a travel window? Brunson is
  blunt that fake urgency "will backfire on you, and you'll lose all
  credibility," and §4 forbids a price deadline. **If there isn't one, say so
  plainly** and email #5 closes on fit instead of time. That is the recommended
  default, and it is not a weaker email.
- **C4.** Confirm or replace, each is live: *"Typically six to twelve weeks"*
  (`landing.ts:134`), *"A defined ninety-day program"* (`:154`), *"The deepest
  engagement I offer. A handful a year."* (`:155`). §2 names "specific engagement
  lengths" as an invented-claim class.
- **C5.** `GATES email #4` — `landing.ts:67` says *"Weekly updates come as a short
  video."* Is that **every** week, or typical? Email #4 quotes it, and "every" is
  a different promise from "typically".
- **C6.** Is the guarantee at `landing.ts:195` (thirty days, free follow-up
  session) exactly current? It gets quoted **verbatim**, never paraphrased.

## Group D — post-call and no-show (track 4)

- **D1.** When someone doesn't show, what do you actually do now? One reschedule
  attempt, two, then what? The email would assert a process, so it has to be your
  real one. *(Note: Calendly cannot detect a no-show — the host marks it by hand,
  and the button only appears after the start time.)*
- **D2.** What do you say at the end of every intro call that the follow-up
  should echo? Verbatim, please.
- **D3.** May post-call emails auto-send, or must each be a draft you approve?
  Recommended: draft-then-approve — the only true content in a post-call email is
  what was actually said on the call.

## Group E — identity and polarity (Secret #6) · sets the voice everywhere

- **E1.** Which identity are you writing as? **Leader** (walked the path, showing
  it) · **Adventurer/Crusader** (on a quest, reporting back) ·
  **Reporter/Evangelist** (interviewing and synthesising). Pick one — the notes
  list exactly these three.
- **E2.** Brunson: *"If you're neutral, no one will hate you, but no one will
  know who you are either."* What will you say that a slice of readers will
  actively disagree with? What are you against — agencies? no-code? hiring a
  junior dev? stacking SaaS subscriptions?
- **E3.** Who is the reader *not*, in your telling?

## Group F — sending mechanics (these are promises too) · BLOCKING

- **F1.** Cadence is five daily emails, then weekly. Are you committing to
  **weekly**, or to "when I have something"? Email #1 sets the expectation and
  §3 says don't promise what isn't built — including by you.
- **F2.** From-name and address. `convex/emails.ts:60` currently defaults to
  `noreply@icodemybusiness.com`. A personal-voice sequence from `noreply`
  contradicts *"a real human reads every message"* (`convex/emails.ts:162`,
  `src/emails/WelcomeEmail.tsx:99`). Ship as
  `Matthew Kerns <matthew@icodemybusiness.com>`?
- **F3.** Reply-to: will replies actually reach you and get answered? Two live
  emails already promise this.
- **F4.** Unsubscribe wording, and where the link lands.
- **F5.** **Physical mailing address for the footer.** CAN-SPAM requires a valid
  postal address in commercial email. A registered agent or PO box qualifies. An
  agent inventing one is a legal defect, not a copy nit — so this is blocking.

- **F6.** **Consent — do we have permission to send email #2 at all?** `BLOCKING`.
  Raised by the cmo session (D3), and a real gap in the original plan. Every
  capture on the site promises one specific deliverable and nothing more:
  `/free-tools` says *"Get the download links by email"*, `/academy` says
  *"Format, price, and start date go to this list first"*, the assessment
  promises a write-up. **None of them says "and a five-part email series."**
  `leads` has no consent field (`convex/schema.ts:20–36`). Sending a nurture
  sequence to those addresses delivers something nobody agreed to — a §3 problem
  before it is a legal one. Three options, your call:
  1. Add a consent line to each capture form plus `leads.consentedAt` /
     `consentSource`, and **hold every address captured before that ships**.
     Slowest, cleanest, and the only one that is unambiguously honest.
  2. Add the field going forward, and send to the existing list once with a
     plain re-permission email that defaults to *not* enrolling.
  3. Treat the assessment as consent on its own (they asked for advice and got
     a report) and sequence only that track. Narrowest, defensible, ships now.

## Group G — academy (§3: don't promise what isn't built)

- **G1.** What exists today that a waitlist member can actually receive?
  Exhaustive list.
- **G2.** For each of date · price · format · cohort size · outcome · refund:
  give the one sentence you'll stand behind, or write **"say nothing"**.
- **G3.** `LIVE` — `src/app/academy/page.tsx:229` says *"The first cohort is
  small, and I write to everyone on this list personally…"* True at any list
  size? At what size does it stop being true?
- **G4.** `LIVE` — `src/app/academy/page.tsx:238` promises *"No spam, and you can
  leave any time."* Nothing implements leaving today. Phase 2 of the plan builds
  it, which makes the promise true rather than needing a rewrite — flagging so
  you know it is currently a §3 violation.

## Group H — proof

- **H1.** Every result you can state publicly **with written permission**: what
  changed, over what period, for whom.
- **H2.** How many businesses? Will you publish the number? (ROADMAP R-014 blocks
  the testimonials page as an unverified draft, so there is no usable proof line
  today.)
- **H3.** `src/app/academy/page.tsx:95` claims *"eight-plus years"* and names four
  products. Which may be named to strangers, and which are under NDA?

---

## One ruling that isn't a question

`docs/copy-principles.md` §1 says customer-facing copy should be about the
reader's outcomes, and its test is *"whose activity is the subject?"* Emails #2
and #3 are unavoidably about you. That is a real conflict, not a technicality.

**Proposed resolution, for you to accept or reject:** §1 governs *pages*, where
the reader arrived with a question about themselves. A story email is a different
genre and a different contract. The guard that carries §1's intent into the
sequence: **every story email must turn to the reader before it ends** — on their
own words from their assessment, never on a claim about the business.

If you reject this, the Soap Opera Sequence does not apply here and the sequence
needs a different shape. Say so and we'll design one.
