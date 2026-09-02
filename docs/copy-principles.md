# Copy principles — customer-facing surfaces

Rules for anyone (human or agent) writing or editing visitor-facing words on
icodemybusiness.com. Each one exists because of a specific thing that went wrong
or was decided; the reason is kept with the rule so it can be argued with rather
than cargo-culted.

Where the words live: [`src/content/landing.ts`](../src/content/landing.ts) holds
the homepage letter. Page-specific copy sits in its own route file. Prefer
editing content over editing components.

---

## 1. Meet the reader where they are. Write outcomes, not process.

**Matthew's rule, 2026-09-02, verbatim intent:** customer-facing pages should
always meet the customer where they are in their journey — why they are on this
page, at the current level of information we have about them — and speak to the
outcomes they are trying to achieve.

The corollary he stated directly: **do not communicate the internal process.**
How the work gets done is not the reader's question. What they end up with is.

| Don't | Do |
|---|---|
| "I research your business before the first working session, write the architecture myself, and review every line." | "You end up with a working system your team can run — and the hours back that it frees up." |
| "I work as your engineering and AI partner: setting direction, building, and levelling up whoever you already have." | "The capability of a senior engineering hire inside your business — without the search, the seat, or the salary." |
| "How I work, and why it's different" | "What you end up with" |

The test: read the sentence and ask *whose activity is the subject?* If it is
Matthew's, rewrite it around the reader's result.

**Not the same as hiding specifics.** "Weekly updates come as a short video — a
screen share run-through of what changed that week" is fine: it describes what
the client *receives*, not how the sausage is made.

## 2. Never author a claim about the business. Only Matthew can assert one.

Anything about capacity, timelines, delivery standards, prices, client counts, or
what happens "every time" is a **fact about Matthew's business**. An agent
inventing one and writing it in his voice puts an unverified assertion in front of
a buyer.

This happened at scale on 2026-09-02: nine such claims reached the live homepage,
including "every engagement ships something usable each week", "I hold very few of
these at once", and specific engagement lengths. All were plausible. None had been
stated by Matthew.

If a claim is needed and you don't have it:
- Ask, or
- Leave the strongest true thing you *do* have, or
- Mark it clearly and don't ship it.

Never split the difference by writing something plausible.

## 3. Don't promise what isn't built.

The homepage account gate told visitors their assessment was "kept in one place —
so you can come back to the full report, pick up where you left off". Nothing
implemented resuming. Corrected in `1a2e011`.

Before writing a capability into copy, find the code that does it. If the feature
is partial, promise the part that works: completed reports do follow the account,
so that is what the gate now says.

## 4. No visible pricing. Signal the tier instead.

Standing decision, 2026-09-02. No number appears on any served page. `/subscribe`
redirects to `/consulting`; the Stripe stack stays in-repo, dormant and unlinked.

The tier is carried by **scope, selectivity and commitment language** — the
`commitment` strings in `PATHS` are load-bearing for this, which is why they
survived the paths redesign even when the cards didn't.

Verify against `document.body.innerText`, never the HTML source: grepping raw HTML
for `$[0-9]` matches Next.js RSC module ids (`$12`, `$16`) and reports false
positives.

## 5. Answer objections. Don't soothe them.

"No pitch, no pressure, no obligation" was removed at Matthew's request — that
register reads as reassurance and undercuts premium positioning. Compare:

- **Soothing:** "There's zero obligation and no pressure at all."
- **Answering:** "It depends entirely on which path fits, and I'd rather scope it
  honestly than quote a number at someone I haven't listened to yet."

Related: the `/book` pill still reads "Free · 15 minutes · No obligation", which is
the same family and awaiting Matthew's call.

## 6. Say a thing once, concretely.

Repeating a claim in a vaguer form weakens both instances and doubles the surface
that has to stay true. When a proof point states something precisely, cut the
prose sentence that gestures at the same idea.

## 7. Keep the page internally consistent.

Copy on one surface can be made false by a change on another. Two live examples:

- The gate said the assessment finds "the three things costing you the most time
  and money" after the flow changed to find **one**. Corrected in `07cb539`.
- `VSL.headline` still says "the right three things fixed" while the assessment
  finds one — open as **R-019**, because it is positioning rather than a
  description and only Matthew can settle it.

When changing what a feature does, grep for the copy that describes it.

---

Related: [`docs/ROADMAP.md`](./ROADMAP.md) tracks open copy decisions.
[`docs/DEPLOY.md`](./DEPLOY.md) covers how a change reaches staging.
