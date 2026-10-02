/**
 * The story-intake question set.
 *
 * Every question Matthew alone can answer: his backstory, his epiphany, and
 * each claim about the business that `docs/copy-principles.md` §2 reserves to
 * him. Fragments dropped into `/admin/story` are routed against these ids.
 *
 * This lives in code, not in a table, for the same reason the sequence copy
 * does: it is the spine of what an agent is allowed to assert, and it should
 * change only through a reviewed diff. The *answers* live in Convex
 * (`storyFragments`) because they accumulate; the *questions* do not.
 *
 * Generated from docs/matthew-story-intake.md — keep the two in step.
 */

export type StoryGroup = "A" | "B" | "X" | "R";

export interface StoryQuestion {
  /** Stable id, e.g. "A1". Never reuse or renumber — fragments reference it. */
  id: string;
  group: StoryGroup;
  /** True for the questions that block nurture emails 1–4 entirely. */
  blocking: boolean;
  /** True when the question is about a claim already live on the site. */
  live: boolean;
  question: string;
  hint: string;
}

export const STORY_GROUP_LABELS: Record<StoryGroup, string> = {
  A: "The backstory",
  B: "The epiphany",
  X: "Blocking a first send",
  R: "The rest",
};

export const STORY_QUESTIONS: readonly StoryQuestion[] = [
  {
    id: "A1",
    group: "A",
    blocking: true,
    live: false,
    question: "Describe the single highest-tension moment in your working life that is causally connected to why you build software for businesses.",
    hint: "Write it as a scene, not a summary: where you were, roughly what time of day, what was on the screen, who else it affected. Email 1 opens here.",
  },
  {
    id: "A2",
    group: "A",
    blocking: true,
    live: false,
    question: "What was actually at risk in that moment?",
    hint: "Money, a job, a client, a relationship, your health. Name the concrete stake.",
  },
  {
    id: "A3",
    group: "A",
    blocking: true,
    live: false,
    question: "The five to eight steps that led there, in order, with rough dates or ages.",
    hint: "This is the backfill that comes after the opening scene.",
  },
  {
    id: "A4",
    group: "A",
    blocking: true,
    live: false,
    question: "What did you believe at the time that turned out to be wrong?",
    hint: "",
  },
  {
    id: "A5",
    group: "A",
    blocking: true,
    live: false,
    question: "The wall. What did you try that failed, and when did you know you were out of options?",
    hint: "Email 1 ends here. Do not resolve it — that is email 2.",
  },
  {
    id: "A6",
    group: "A",
    blocking: true,
    live: false,
    question: "Who else is in this story, and which names may be published?",
    hint: "Anything that must be anonymised — “a wholesaler in the Midwest” — say so.",
  },
  {
    id: "A7",
    group: "A",
    blocking: true,
    live: false,
    question: "Redaction list: what are you not willing to have in writing to strangers?",
    hint: "",
  },
  {
    id: "A8",
    group: "A",
    blocking: true,
    live: false,
    question: "Two things you got wrong, were bad at, or still are. Which may be published?",
    hint: "Brunson's argument is that a flawless character does not connect. Your call, not the framework's.",
  },
  {
    id: "A9",
    group: "A",
    blocking: true,
    live: false,
    question: "Is this the same story for the consulting audience and the academy audience?",
    hint: "If they need different backstories, give both.",
  },
  {
    id: "B1",
    group: "B",
    blocking: true,
    live: false,
    question: "What was the insight that got you off the wall?",
    hint: "One sentence, as you would say it out loud.",
  },
  {
    id: "B2",
    group: "B",
    blocking: true,
    live: false,
    question: "What triggered it — a person, a book, a project, an offhand comment?",
    hint: "Give the scene.",
  },
  {
    id: "B3",
    group: "B",
    blocking: true,
    live: false,
    question: "What did you do differently the very next day?",
    hint: "",
  },
  {
    id: "B4",
    group: "B",
    blocking: true,
    live: false,
    question: "What was the first result of applying it — and can you defend it publicly if challenged?",
    hint: "If you cannot defend it to a prospect, we say nothing.",
  },
  {
    id: "B5",
    group: "B",
    blocking: true,
    live: false,
    question: "What do you want the reader to believe is possible that they don't believe now?",
    hint: "",
  },
  {
    id: "B6",
    group: "B",
    blocking: true,
    live: false,
    question: "One sentence each on how that insight lands for diagnostic, build, fractional and program.",
    hint: "Email 2 branches on whichever path the assessment recommended, so it needs all four.",
  },
  {
    id: "F5",
    group: "X",
    blocking: false,
    live: false,
    question: "A physical mailing address for the email footer.",
    hint: "CAN-SPAM requires one in commercial email. A PO box or registered agent qualifies. The sender refuses to send without it — an agent inventing one would be a legal defect.",
  },
  {
    id: "F1",
    group: "X",
    blocking: false,
    live: false,
    question: "Are you committing to a weekly email after the first four, or to “when I have something”?",
    hint: "The first email sets the expectation, and §3 says don't promise what isn't built — including by you.",
  },
  {
    id: "C1",
    group: "X",
    blocking: false,
    live: true,
    question: "landing.ts:145 — “A monthly retainer, capacity-limited — I hold very few of these at once.”",
    hint: "copy-principles §2 names that exact phrase as one of the nine agent-invented claims, and git log -S shows the remediation commit never replaced it. It is on your homepage now. Confirm, replace, or delete.",
  },
  {
    id: "C9",
    group: "X",
    blocking: false,
    live: true,
    question: "landing.ts:204 — “I tell you what I'd fix first and whether I'm the right person to fix it.”",
    hint: "Same origin as C1, never ratified. You removed this exact clause from the report when you wrote the good-fit sentence. My suggestion: replace it on the homepage with that sentence — one move fixes the page and makes letter and email agree.",
  },
  {
    id: "C3",
    group: "X",
    blocking: false,
    live: false,
    question: "Is there any real deadline in the next 30 days — a cohort date, a capacity cutoff, a rate change?",
    hint: "If there is not, say so plainly and email 4 closes on fit instead of time. That is the recommended answer, and it is not a weaker email. Fake urgency costs credibility permanently.",
  },
  {
    id: "C2",
    group: "R",
    blocking: false,
    live: false,
    question: "How many engagements can you actually hold at once today? Will you put a number in writing?",
    hint: "",
  },
  {
    id: "C4",
    group: "R",
    blocking: false,
    live: true,
    question: "Confirm or replace: “Typically six to twelve weeks”, “A defined ninety-day program”, “The deepest engagement I offer. A handful a year.”",
    hint: "landing.ts:134, :154, :155 — §2 names specific engagement lengths as an invented-claim class.",
  },
  {
    id: "C5",
    group: "R",
    blocking: false,
    live: true,
    question: "landing.ts:67 — “Weekly updates come as a short video.” Every week, or typical?",
    hint: "Email 3 quotes it, and “every” is a different promise from “typically”.",
  },
  {
    id: "C6",
    group: "R",
    blocking: false,
    live: true,
    question: "Is the guarantee at landing.ts:195 (thirty days, free follow-up session) exactly current?",
    hint: "It gets quoted verbatim, never paraphrased.",
  },
  {
    id: "C7",
    group: "R",
    blocking: false,
    live: true,
    question: "“I spend 2-3 hours researching your business…” — four places. True every time?",
    hint: "consulting/page.tsx:33, :67, :68 and BonusStack.tsx:16. Also close to §1's own “Don't” example, because the subject is your activity rather than the reader's result.",
  },
  {
    id: "C8",
    group: "R",
    blocking: false,
    live: true,
    question: "“Direct access to me for 30 days after our session” — three places, three wordings.",
    hint: "BonusStack.tsx:34, consulting/page.tsx:83, services/page.tsx:183. A different promise from the thirty-day guarantee, and having both live invites conflating them.",
  },
  {
    id: "D1",
    group: "R",
    blocking: false,
    live: false,
    question: "When someone doesn't show for a call, what do you actually do now?",
    hint: "One reschedule attempt, two, then what? Calendly cannot detect a no-show — the host marks it by hand — so the email would assert your real process.",
  },
  {
    id: "D2",
    group: "R",
    blocking: false,
    live: false,
    question: "What do you say at the end of every intro call that the follow-up should echo?",
    hint: "Verbatim, please.",
  },
  {
    id: "D3",
    group: "R",
    blocking: false,
    live: false,
    question: "May post-call emails auto-send, or must each be a draft you approve?",
    hint: "Recommended: draft-then-approve. The only true content in a post-call email is what was actually said.",
  },
  {
    id: "E1",
    group: "R",
    blocking: false,
    live: false,
    question: "Which identity are you writing as: Leader, Adventurer/Crusader, or Reporter/Evangelist?",
    hint: "The notes name exactly these three. It sets the voice for every track.",
  },
  {
    id: "E2",
    group: "R",
    blocking: false,
    live: false,
    question: "What will you say that a slice of readers will actively disagree with?",
    hint: "“If you're neutral, no one will hate you, but no one will know who you are either.” What are you against — agencies? no-code? stacking SaaS subscriptions?",
  },
  {
    id: "E3",
    group: "R",
    blocking: false,
    live: false,
    question: "Who is the reader not, in your telling?",
    hint: "",
  },
  {
    id: "F2",
    group: "R",
    blocking: false,
    live: false,
    question: "From-name and address — confirm Matthew Kerns <matthew@icodemybusiness.com>.",
    hint: "Already changed in code from noreply@. RESEND_FROM_EMAIL on the Convex deployment still overrides it and only the deploy session can read that.",
  },
  {
    id: "F3",
    group: "R",
    blocking: false,
    live: false,
    question: "Replies reach you and you answer them — confirmed. Anything to add?",
    hint: "Answered yes. The copy says “I'll get back to you as soon as I can”, deliberately with no turnaround time, because a turnaround time is a delivery standard.",
  },
  {
    id: "F4",
    group: "R",
    blocking: false,
    live: false,
    question: "Unsubscribe wording, and where the link should land.",
    hint: "",
  },
  {
    id: "F6",
    group: "R",
    blocking: false,
    live: false,
    question: "Consent line wording for each capture form.",
    hint: "You ruled: consent lines plus leads.consentedAt ship first, and every address captured before that is held out permanently. The wording promises a cadence, so it depends on F1.",
  },
  {
    id: "G1",
    group: "R",
    blocking: false,
    live: false,
    question: "What exists today that an academy waitlist member can actually receive?",
    hint: "Exhaustive list.",
  },
  {
    id: "G2",
    group: "R",
    blocking: false,
    live: false,
    question: "For each of date, price, format, cohort size, outcome, refund — the sentence you'll stand behind, or “say nothing”.",
    hint: "",
  },
  {
    id: "G3",
    group: "R",
    blocking: false,
    live: true,
    question: "academy/page.tsx:229 — “I write to everyone on this list personally before it opens.” True at any list size?",
    hint: "At what size does it stop being true?",
  },
  {
    id: "H1",
    group: "R",
    blocking: false,
    live: false,
    question: "Every result you can state publicly with written permission.",
    hint: "What changed, over what period, for whom.",
  },
  {
    id: "H2",
    group: "R",
    blocking: false,
    live: false,
    question: "How many businesses? Will you publish the number?",
    hint: "ROADMAP R-014 blocks the testimonials page as an unverified draft, so there is no usable proof line today.",
  },
  {
    id: "H3",
    group: "R",
    blocking: false,
    live: true,
    question: "academy/page.tsx:95 names four products and claims “eight-plus years”. Which may be named to strangers?",
    hint: "Which are under NDA?",
  },
];

/** Ids that block nurture emails 1–4. Empty coverage here is the critical path. */
export const BLOCKING_QUESTION_IDS: readonly string[] = STORY_QUESTIONS.filter(
  (q) => q.blocking
).map((q) => q.id);

const BY_ID: Record<string, StoryQuestion> = Object.fromEntries(
  STORY_QUESTIONS.map((q) => [q.id, q])
);

export function getStoryQuestion(id: string): StoryQuestion | null {
  return BY_ID[id] ?? null;
}

/** Server-side guard: routing may only reference questions that exist. */
export function isStoryQuestionId(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(BY_ID, id);
}
