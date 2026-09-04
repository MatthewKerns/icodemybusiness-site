---
name: email-voice
description: How email from icodemybusiness.com is written — register, what may never be asserted, the Soap Opera arc, what each track can actually personalize, and the rendering mechanics of convex/emails.ts. Use when writing or editing ANY email the site sends (welcome, discovery report, nurture sequence steps, booking confirmations, admin alerts), when reviewing email copy, or when the user says "email voice", "write the sequence", "draft email 2", "review this email". Load before touching convex/emails.ts, src/emails/*, or convex/lib/sequenceTracks.ts.
---

# Email voice — icodemybusiness.com

The pages got a copy pass. **The email layer never did.** As of 2026-09-04 the
booking confirmation still says *"no pressure, just clarity"* — the exact
register removed from the homepage — and still says *"30-minute discovery call"*
against a 15-minute event. Assume any email you open predates the rules below.

`docs/copy-principles.md` governs every visitor-facing word and is **not**
restated here. Read it first. This file is only what is different about email.

---

## 1. The register

Matthew's words for what these should be: *simple conversational text with
genuinely valuable insights at this point in their journey, and their stage of
engagement and interaction with us.*

Four things that implies, in order of how often they get violated:

**Meet them where they actually are.** A free-tools subscriber and someone who
just spent ten minutes answering five questions about their business are not the
same reader. Never send the second reader's email to the first — you will be
promising familiarity you do not have.

**One idea per email.** The value is the insight, not the volume. If an email
teaches two things, it teaches neither.

**Short lines, heavy white space, no long paragraphs.** This is Brunson's rule
for the Soap Opera Sequence (`docs/dotcom-secrets-notes.md`, Secret #7) and it is
also just how email reads. See §5 — `mdToHtml` gives you this for free.

**Cut the reassurance.** Matthew removed *"Keep it whether or not we ever work
together"* from the report intro on 2026-09-04, leaving *"Here is the write-up
from your assessment."* The cut clause was doing two bad things at once:
soothing (§5) and saying what the email's own contents already said (§6).

| Don't | Do | Why |
|---|---|---|
| "Here is the write-up from your assessment, in your own words. Keep it whether or not we ever work together." | "Here is the write-up from your assessment." | Matthew's edit, 2026-09-04. The quotes block already shows their own words |
| "…no pressure, just clarity." | "I'll tell you if I think we are not a good fit and why." | §5: answer objections, don't soothe |
| "If one of these is off, that's the first thing to correct." | "Here is what you told me, in your words." | §3: there is no post-send correction flow. Don't invite an action that doesn't exist |
| "a real person reads every message" | "Reply to this email and I'll get back to you as soon as I can." | Matthew's edit. First person, and it commits to a *response*, not just to reading — with an honest hedge rather than a turnaround time he'd have to meet |
| "whether I'm the right person to fix it" | "I'll tell you if I think we are not a good fit and why. And if we are a good fit, I'll tell you how I recommend we get started." | His replacement. A commitment is stronger than a hedge — and only he could write it |

That third row is real: it was a proposed framing sentence, caught in review
because nothing implements correcting a quote after the email is sent.

**Write in first person.** "A real person reads every message" is a fact about
someone. "I read every reply" is a promise from Matthew. The whole point of the
register is that these emails come from a person, so third-person constructions
about that person read as corporate no matter how warm the words are.

### Labels

Report labels are written sentence-case in source and rendered UPPERCASE by
`emailStyles.label`. Two rules:

- **One heading per idea.** The report had "What it costs" (prose) and, two
  unrelated rows below it, a second cost heading over the visitor's own figure.
  A hard number belongs directly under the prose that describes it, not in its
  own distant section (§6).
- **Match the register of the labels around it.** The existing set is
  conversational — "How long, and what you've tried", "If nothing changes",
  "The outcome you want". A clinical label dropped into that run reads as
  imported from a different document.

---

## 2. What an agent may never write in an email

`docs/copy-principles.md` §2 in its email form. **If you need one of these and
don't have it, leave it out and say so — never write something plausible.**

- **Matthew's backstory and his epiphany.** These are the entire body of Soap
  Opera emails #2 and #3. There is nothing in this repo to draft them from. They
  come from `docs/matthew-story-intake.md` and nowhere else.
- Capacity, concurrency, selectivity ("a handful a year", "very few at once").
- Engagement lengths, timelines, start dates, cohort dates.
- Delivery standards — anything with "every", "always", "each week".
- Client counts, results, outcomes. `ROADMAP.md` R-014 blocks the testimonials
  page as unverified, so there is no usable proof line.
- Prices, ranges, or anything that lets one be inferred (§4).
- **Urgency.** Brunson: *"Fake urgency will backfire on you, and you'll lose all
  credibility."* No real deadline exists in this repo. Close on fit, not time,
  unless Matthew has given you a specific dated reason.
- **Send cadence.** "Weekly" is a promise about the future. The *shape* (day 0,
  then four daily, then weekly) is decided; whether Matthew commits to *sustaining* weekly
  is question F1 in the story intake and is unanswered. Don't write the promise
  until it is.

**Answered, so no longer blocked:** replies reach Matthew and he answers them
(F3, 2026-09-04). The reply promise is true and may be written. Two caveats:
what makes it true in practice is the *from-address* (§6), and the promise is
to reply "as soon as I can" — **never** attach a turnaround time to it, because
that is a delivery standard and §2 puts those in Matthew's hands only.

**The one legitimate urgency in the whole system is the reader's own.** Their
stated cost of inaction is *their* claim, recorded in their assessment. Quoting
it back is not authoring a claim. Everything else is.

---

## 3. The arc

Soap Opera Sequence: the day-0 report, then **four** daily steps, then weekly —
five sends across five days. Say it that way rather than "five daily": day 0 is
triggered by the assessment submission, and only d1–d4 are on the daily cadence
in `sequenceTracks.ts`.

Email #1's job — welcome, expectations, first open loop — is folded into the
day-0 report rather than sent twice (§6). Structure lives in `convex/lib/sequenceTracks.ts`; a step
with `subject: null` is unauthored and the engine refuses to send it.

| Day | Role | Ends on |
|---|---|---|
| 0 | The report + set the stage | An open loop into tomorrow |
| 1 | High drama, then backstory | **The wall.** Unresolved — that is the point |
| 2 | The epiphany | The turn, branched on `recommendedPath` |
| 3 | Hidden benefits | The non-obvious upside |
| 4 | Urgency and the ask | A real reason, or fit |

**Every story email must turn to the reader before it ends** — on their own
words from their assessment, never on a claim. This is the guard that carries
§1's "whose activity is the subject?" into a genre that is unavoidably about
Matthew. If a story email ends on Matthew, it is not finished.

---

## 4. What each track can honestly personalize

Check this before writing a single personalized sentence. Promising familiarity
you don't have reads worse than a plain email.

| Track | Source | Available |
|---|---|---|
| assessment | `assessments` row | Name, five summary fields, **verbatim quotes**, a cost figure when they gave one, their recap correction, `recommendedPath`, `thisWeekAction` |
| free-tools | `leads` only | Email, and which tool they took (best-effort via `visitorEvents.by_sessionId`). **No name** — `EmailCapture` never collects one |
| academy | `leads` only | Email. And §3 bites hard: no product exists, so no date, price, format, cohort size, or "you'll leave with software running" addressed to a person |
| post-call | the call | Only what was said on it, which only Matthew knows. Draft-then-approve, never autonomous |

**Never invent a figure.** `src/content/discovery-questions.ts` tells the
assessment agent to mark a missing number TBD rather than guess; an email
inherits that rule. No cost figure means no cost sentence.

---

## 5. Rendering mechanics — `convex/emails.ts`

Black `#000`, gold `#D4AF37`, Inter, 580px container. Four things that will bite
you:

1. **`mdToHtml` cannot emit links.** It runs `escapeHtml` over the whole string
   first. Every CTA must use the explicit
   `<a style="${emailStyles.button}" href="…">` pattern. Do not put an inline
   link inside a markdown block — it will render as visible angle brackets.
2. **`escapeHtml` does not escape quotes.** It handles `&`, `<`, `>` only. Safe
   in text nodes; **unsafe in an attribute.** Lead-supplied text going into an
   href must be `encodeURIComponent`'d. `bookingUrlFor` does this correctly via
   `URL`/`searchParams` — don't regress it.
3. **`mdToHtml` maps each newline-separated line to its own `<p>`.** That is
   exactly the Soap Opera short-line, heavy-white-space look, for free. Author
   story emails as newline-separated markdown.
4. **Quotes contain newlines and are deliberately not normalized** — they are
   raw slices of what someone typed into a textarea. Collapse whitespace at
   render (`.replace(/\s+/g, " ").trim()`). **Never edit the words themselves:**
   no paraphrase, no tidying, no fixing their grammar.

---

## 6. Transactional vs marketing — they are not the same email

| | Transactional | Marketing |
|---|---|---|
| Examples | welcome, discovery report, booking confirmation | every sequence step |
| `List-Unsubscribe` | **No** — unsubscribing from a receipt is meaningless | **Yes**, with `List-Unsubscribe-Post` |
| Postal address | Yes | Yes (CAN-SPAM) |
| Suppression scope | blocked only by `scope: "all"` | blocked by `"marketing"` too |
| Consent required | No — they asked for it | **Yes.** No `leads.consentedAt`, no send |

Both `List-Unsubscribe` headers are required *together* by Gmail/Yahoo
bulk-sender rules. Sending one without the other is worse than neither.

**The from-address has to make the copy true.** These emails say "reply to this
email" and "I read every reply". They must not arrive from `noreply@`. The
in-code default is `matthew@icodemybusiness.com` (`convex/emails.ts`), matching
the Next.js welcome route — but `RESEND_FROM_EMAIL` on the Convex deployment
overrides it, and only the deploy session can read or set that. If you add a
reply-invitation to any template, confirm the sender first: a promise the
envelope contradicts is worse than no promise.

---

## 7. Before you ship an email

- [ ] Every sentence asserting a fact about the business traces to
      `docs/matthew-story-intake.md` or `src/content/landing.ts`. Cite the line.
- [ ] No price, and no figure that implies one.
- [ ] No promise of anything not built — including a cadence, and including a
      reply you're not sure reaches a human.
- [ ] No reassurance register. Read every sentence and ask: is this answering an
      objection, or soothing one?
- [ ] Nothing said twice. If a block already shows it, don't also say it.
- [ ] It turns to the reader before it ends.
- [ ] `internalBrief` is not reachable from this template. Assert it in a test:
      `expect(html).not.toContain(brief)`.
- [ ] Every send lands in `emailSends` — that is the `convex/AGENTS.md` rule.
- [ ] If it's marketing: unsubscribe link, both headers, postal address, and the
      consent gate upstream.

---

## Related

`docs/copy-principles.md` (governs) · `docs/matthew-story-intake.md` (the only
source for Matthew's claims) · `docs/dotcom-secrets-notes.md` (Secret #7 and #8,
full extraction) · `convex/lib/sequenceTracks.ts` (step definitions) ·
`convex/AGENTS.md` (Convex rules).
