# Draft — "Book a call if / Don't book a call if" (homepage, before the close)

Written with the `copy-write` skill from `docs/copy/preferences.md` + `docs/OFFER.md`.
Every sentence is tagged with the fact of Matthew's it rests on; untagged words are
framing. Status: **options for Matthew to rewrite**, nothing shipped. His 2026-09-06
ruling already applied: no "where your week goes" angle (P6).

**Reader's moment:** they have read the paths, the objections and the guarantee and are
one scroll from the button. The job is fit, in their terms, not a pitch (P1, P4).

## Heading options
- A. Should you book the call?
- B. Is this call for you?

## Book a call if
1. Things are running, and you're ready to take the manual and repetitive work off your
   plate. [his FAQ answer 1, 09-05; his subhead]
2. You'd rather spend your time on the work that grows the business than on the work that
   keeps it running. [his subhead, 09-04]
3. You want to own what gets built and watch it working every week. [owns it outright,
   Fathom 08-26; weekly walkthroughs, 09-04]

## Don't book a call if
1. You're looking for the cheapest option. [FAQ answer 4 tier sentence, his ruling 09-05]
2. Nothing in the business is running smoothly yet. If it's not working, we don't want to
   automate it. [his words, 09-04]
3. You want a price before a conversation. I don't quote numbers at people I haven't
   listened to yet. [FAQ answer 4, approved 09-05; P3]

Not used: the academy's "You want it done for you" — done-for-you is the top rung here.

## copy-lint result
P3 none · P4 none · P5 none · P6 none (the "week" angle removed) · P2: every claim is
tagged to a ruling or his words · minutes: none. Clean.

## Implementation once he rules
`FIT` export in `src/content/landing.ts`; a two-card `Beat` in
`src/components/landing/letter/SalesLetter.tsx` between the guarantee and "Where this
starts" (academy card markup as the pattern); `allCopy()` in
`src/content/__tests__/landing.test.ts` extended so the standing invariants cover it.
