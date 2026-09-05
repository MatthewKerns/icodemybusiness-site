# /academy — every promise on the page, labelled

Inventory of what `src/app/academy/page.tsx` promises a visitor, one row per
promise, using the label discipline from `docs/OFFER.md` § "Value in your inbox":

| Label | Meaning |
|---|---|
| **live** | true today, verified in code or in the product |
| **decided** | Matthew has ruled; not yet built or not yet on the page |
| **being built** | on a branch, not on `main` |
| **open** | Matthew has to rule; the row carries the one question |

Rule: nothing repeats on a visitor surface unless **live**. For every row that is
not live, the last column gives either the question Matthew must answer or the
wording that is true today. **No visitor-facing edit until he rules.** Requested by
Matthew via the marketing board (M13), 2026-09-04. Owner of this file: `offer`.

The cmo session's audit (`docs/marketing/copy-trust-gap-audit.md`, on their
worktree) has one academy row — line 95, "claim-needed", close via story intake.
This file agrees with it and adds the rest.

## What exists behind the page (verified 2026-09-04)

- The capture at :235 calls `leads.createLead` with `source: "academy"` and
  **sends nothing** — no `onSuccess`, no welcome route call (compare
  `src/app/free-tools/page.tsx:89`). A visitor who joins hears nothing.
- The form collects an email only. There is no field for "what you are trying to
  build" (:230).
- `leads` has no consent field and there is no unsubscribe anywhere on `main`
  (`grep -rln "unsubscribe\|consentedAt" src convex` → nothing). The one-click
  unsubscribe is on email-followup's branch, unmerged (ROADMAP R-022).
- No cohort, curriculum, schedule or price exists in the repo (`offers/`,
  `content/`, `docs/`). The page's own comment at :33 says the schedule firms up
  "once cohort one is scoped".
- Nothing on `main` sends a second email to anyone (OFFER.md § inbox).

## Rows

| # | Line | The promise (as written) | Label | Why | Question for Matthew, or wording true today |
|---|---|---|---|---|---|
| 1 | :18, :22, :112 | "Learn to build your own software, professionally. A developer academy for founders…" | **open** | Describes a product that does not exist yet anywhere in the repo. | Q1. Is the academy a product you are committing to run, or a list to gauge interest? If the latter, the page should say "planned" once, near the top. |
| 2 | :39 | "You leave with software that runs, that you own, and that you can keep changing." | **open** | Outcome promise for an unscoped programme. | Q2. Is this the promised outcome of cohort one? If not yet, wording true today: "The aim: software that runs, that you own, and that you can keep changing." |
| 3 | :44, :49, :54 | Four curriculum pillars, "taught against your own project, in this order" (:169) | **open** | No curriculum exists in the repo; the comment at :33 says it is deliberately not a syllabus. | Q3. Keep the four pillars as the planned shape? They read as description, not promise, except "in this order" (:169), which asserts a sequence nobody has written. Wording true today: drop "in this order, because each one makes the next one safe". |
| 4 | :59 | "quotes to build it start at five figures" | **live** | A statement about the market, not about the business. No action. | — |
| 5 | :66 | "You want it done for you. That is real work I do — it is just not this." | **live** | Done-for-you is the top rung in OFFER.md and `/consulting` exists. | — |
| 6 | :67 | "Every module ends with something running." | **open** | Format promise for modules that do not exist. | Q4. Is "every module ends with something running" a design rule you will hold to? If yes, it is decided and can stay; if not, wording true today: "The plan is that every module ends with something running." |
| 7 | :74 | "…you will be slower for the first stretch and you will still get there." | **open** | "You will still get there" is an outcome guarantee to a stranger. | Q5. Keep the guarantee? Wording true today: "…you will be slower for the first stretch. That is expected, not disqualifying." |
| 8 | :84 | "Software you built, deployed and running against your real business, plus the working habits to keep extending it. Not a certificate." | **open** | Same deliverable as row 2, stated as fact. | Same ruling as Q2 covers this row. |
| 9 | :89 | "The first cohort is being scoped now and I am keeping it small on purpose." | **open** | No evidence of scoping in the repo or the transcripts I have. | Q6. Is cohort one actually being scoped now? If not: "A first cohort is planned and will be small." |
| 10 | :89 | "Join the list and I will write to you directly with the format, the price, and the start date before it opens to anyone else." | **open** | Nothing sends. "Write to you directly" is only true if Matthew emails the `academy` leads by hand; the list is queryable (`leads.by_source`). | Q7. Will you personally email this list with format, price and date before public launch? If yes: decided, and it becomes live the first time it happens. If it should be automatic, it belongs to R-022 and cannot be promised yet. |
| 11 | :95 | "Matthew Kerns — eight-plus years building software professionally, and the person who built the tools on this site: an inventory and restock system used by Amazon sellers, a brand-positioning coach, an agency operations platform, and this site itself." | **open** | Claims about Matthew; only he asserts them (copy-principles §2). "Used by Amazon sellers" is a customer claim. Matches cmo's row (story intake). | Q8. Confirm the years, and whether "used by Amazon sellers" is true today (paying users, or Matthew's own stores?). Cmo's story intake carries this. |
| 12 | :134 | "First cohort forming now — small on purpose." | **open** | Same as row 9, in the hero. | Same ruling as Q6. |
| 13 | :229 | "The first cohort is small, and I write to everyone on this list personally before it opens." | **open** | Same as row 10; no mechanism, manual only. | Same ruling as Q7. |
| 14 | :230 | "Tell me what you are trying to build and I will tell you honestly whether the academy is the right way to get there." | **open** | There is no way to tell him anything: the form takes an email only and no email is sent to reply to. | Q9. Do you want to hear what they are building? If yes, the fix is product, not copy: a text field on the academy capture, or a reply-able confirmation email (which does not exist yet — R-022). Wording true today: remove the sentence. |
| 15 | :238 | "Format, price, and start date go to this list first." | **open** | Same commitment as row 10, phrased as list-first. | Same ruling as Q7. |
| 16 | :238 | "No spam" | **live** (trivially) | Nothing is sent at all. Becomes a real promise the day the sequence enrols this list; keep. | — |
| 17 | :238 | "you can leave any time" | **being built** | No unsubscribe on `main`; one-click unsubscribe is on email-followup's branch, unmerged. Until it merges, a visitor cannot leave. | Wording true today: "No spam." and stop there, or "No spam — reply *stop* and I remove you" **only if Matthew commits to doing that by hand** (Q10). Restore the line when R-022's unsubscribe is on `main`. |
| 18 | :240 | "You're on the list. I'll be in touch personally — watch your inbox." | **open** | Shown after a capture that sends nothing. "Watch your inbox" promises an email that never comes. | Same ruling as Q7. Wording true today: "You're on the list. Format, price and start date come to this address first." |
| 19 | :252 | "The builder tools I use every day are free and public." | **live** | `/free-tools` exists and ships the downloads. "Every day" is Matthew's own claim; low stakes. | — |
| 20 | :286–291 | "Would rather have it built for you? That is what the consulting work is for." | **live** | `/consulting` exists. | — |

`CommunityBanner` (:281) is a shared component, not academy copy, so it is not
inventoried here — but note it promises "access exclusive content" on Skool on
every page it appears on; that belongs to whoever owns the banner.

## Questions for Matthew (one message, ten rulings)

1. Is the academy a committed product or an interest list? (rows 1, 9, 12)
2. Is "software that runs, that you own, that you can keep changing" the promised outcome? (rows 2, 8)
3. Keep the four pillars, and the "in this order" claim? (row 3)
4. Is "every module ends with something running" a rule you will hold? (row 6)
5. Keep "you will still get there"? (row 7)
6. Is cohort one being scoped now? (rows 9, 12)
7. Will you personally email the list with format, price and date before launch? (rows 10, 13, 15, 18)
8. Confirm "eight-plus years" and "used by Amazon sellers". (row 11; cmo's story intake)
9. Do you want to hear what they are building — field, reply-able email, or drop the sentence? (row 14)
10. Until unsubscribe ships: drop "leave any time", or commit to removing people by hand on reply? (row 17)

## After he rules

- Rulings arrive as a pasted markdown block keyed by line ref (cmo's review
  artifact carries :95, :229, :238). Map each onto the row, update the label, then
  edit `src/app/academy/page.tsx` in one commit per ruling group.
- Anything that becomes **decided** and is a promise goes into the promises
  workbook (AGENTS.md § Ask First).
- Row 17 flips to live only when R-022's unsubscribe is on `main`.
