/**
 * Copy and configuration for the homepage sales letter.
 *
 * Everything a non-engineer might want to reword lives here rather than being
 * buried in JSX, so changing the letter is a content edit, not a component edit.
 *
 * Two standing constraints (2026-09-02):
 *   1. No visible prices anywhere. The letter signals the tier through scope,
 *      commitment and selectivity instead. See docs/ROADMAP.md R-009.
 *   2. Call durations are not hardcoded here — the only live Calendly event is a
 *      generic one, so the letter says "intro call" until R-001 is resolved.
 */

/**
 * The VSL.
 *
 * Deliberately a plain constant rather than a NEXT_PUBLIC_* variable: the URL
 * isn't a secret, and a new public env var would cost a Dockerfile ARG+ENV, a
 * --build-arg in the VPS deploy script, and a value on the box — three moving
 * parts for a string that belongs in the repo.
 *
 * Set `src` to publish the video. While it is null the section renders its
 * poster state, which is a complete, non-broken experience: the letter's promise
 * still reads and the CTA still converts.
 */
export const VSL: {
  src: string | null;
  kind: "youtube" | "vimeo" | "file";
  posterEyebrow: string;
  headline: string;
  subhead: string;
} = {
  src: null,
  kind: "youtube",
  posterEyebrow: "A short message from Matthew",
  headline: "Most businesses don't need more software.",
  subhead:
    "I'm Matthew Kerns. I help identify the key constraints on business workflows. We analyze what works, including creative, manual and repetitive work, to gain an understanding of your business, and help free your time so you can focus on doing the work that grows the business.",
};

/** The problem beat — named, specific, recognisable. */
export const PROBLEM = {
  heading: "You already know something is leaking",
  body: [
    "Work that should take an hour takes a day. The same question gets answered three times. A customer falls through a gap nobody owned.",
    "The usual advice is to add software — but until someone maps where the hours actually go, every fix lands in the wrong place and the business pays for it twice.",
  ],
};

/**
 * Credibility, stated as what the reader ends up with.
 *
 * Standing editorial rule (Matthew, 2026-09-02): customer-facing pages do not
 * describe the internal process. They meet the reader where they are — why they
 * are on this page — and speak to the outcome they came for. So this section
 * says what you get, not how it gets made.
 */
export const STORY = {
  heading: "What you end up with",
  body: [
    "Most consultants leave you with a slide deck and an invoice. You end up with a working system your team can run — and the hours back that it frees up.",
  ],
  proofPoints: [
    {
      label: "Weekly walkthroughs",
      detail:
        "Weekly updates come as a short video — a screen share run-through of what changed in the software that week.",
    },
    {
      label: "You own it outright",
      detail:
        "The system, and a plain-language explanation of how it runs. Nothing about it is designed to keep you dependent on me.",
    },
  ],
};

/**
 * Plot data for the paths diagram. These three fields exist purely for the
 * drawing; the prose fields beside them are what a reader actually reads.
 *
 * They are explicit rather than derived because the prose can't be parsed into
 * coordinates: `timeline` reads "Ongoing, reviewed each quarter", which has no
 * number in it at all, and any parser would silently mis-plot the first time the
 * wording changed.
 */
export type PathPlot = {
  /** 1 = one conversation … 4 = the whole operation. An ordering, not a measurement. */
  depth: 1 | 2 | 3 | 4;
  /** Weeks from the intro call. `null` means the engagement doesn't end. */
  weeks: number | null;
  /** Three or four words, drawn on the chart. The prose lives in `timeline`. */
  shortTimeline: string;
};

export type Path = {
  key: string;
  name: string;
  forWho: string;
  what: string;
  timeline: string;
  commitment: string;
  highlight: boolean;
  plot: PathPlot;
};

/**
 * The four routes in. Presented as a diagnosis — "which one is you" — rather
 * than a menu, so the reader's own situation picks the path for them.
 *
 * `commitment` is the tier signal: it's how the reader works out this is a
 * serious engagement without a number ever appearing. It is load-bearing — the
 * paths diagram can show depth and duration but cannot carry selectivity, so
 * these strings must stay on the page even when the cards don't.
 *
 * The explicit `Path[]` annotation is deliberate: adding a fifth route becomes a
 * compile error until someone has decided where it sits on the chart.
 */
export const PATHS: Path[] = [
  {
    key: "diagnostic",
    name: "Start with a diagnosis",
    forWho: "You know something's wrong, but not what to fix first.",
    what: "Five questions, in your own words, to find the one thing costing you the most time and money right now — and you get the write-up whether or not we go further.",
    timeline: "A few minutes on the assessment, then a call",
    commitment: "Free. This is where most people should start.",
    highlight: true,
    plot: { depth: 1, weeks: 1, shortTimeline: "One call" },
  },
  {
    key: "build",
    name: "Have it built for you",
    forWho: "You already know what needs to exist, and you want it built properly the first time.",
    what: "A defined scope with a fixed shape, and at the end of it a system your team runs without you having to think about it again.",
    timeline: "Typically six to twelve weeks",
    commitment: "A defined project engagement, scoped on the call.",
    highlight: false,
    plot: { depth: 2, weeks: 12, shortTimeline: "6\u201312 weeks" },
  },
  {
    key: "fractional",
    name: "Bring me inside the business",
    forWho: "This isn't one project — you need the capability in-house, permanently.",
    what: "The capability of a senior engineering hire inside your business — without the search, the seat, or the salary — including levelling up whoever you already have.",
    timeline: "Ongoing, reviewed each quarter",
    commitment: "A monthly retainer, capacity-limited — I hold very few of these at once.",
    highlight: false,
    plot: { depth: 3, weeks: null, shortTimeline: "Ongoing" },
  },
  {
    key: "program",
    name: "Rebuild how the business runs",
    forWho: "The back office is the bottleneck and you want it structurally different, not patched.",
    what: "A defined outcome with a start and an end: the manual core of your operation replaced by systems that run themselves, with your team trained to keep them running.",
    timeline: "A defined ninety-day program",
    commitment: "The deepest engagement I offer. A few slots available per year.",
    highlight: false,
    plot: { depth: 4, weeks: 13, shortTimeline: "90 days" },
  },
];

/**
 * Objections answered where a reader would raise them. Sourced from the
 * /consulting and /book FAQs, rewritten for the letter.
 *
 * Register note (docs/ROADMAP.md R-008): avoid reassurance-shaped copy —
 * "no pitch, no pressure, no obligation" was removed at Matthew's request
 * because it undercuts the positioning. Answer the objection; don't soothe it.
 */
export const OBJECTIONS = [
  {
    q: "What if AI genuinely doesn't fit my business?",
    a: "Then I'll say so. Every business has manual, repetitive work worth removing, but not every business needs AI to remove it — sometimes the answer is a process change and a spreadsheet. If I can't find something worth doing, you'll hear that from me directly rather than after you've paid to find out.",
  },
  {
    q: "I'm not technical. Will I be able to run this?",
    a: "Most of the people I work with are business owners, not developers. I translate the technical side into plain language and build systems you can operate yourself. You get tools that work, not homework you can't finish.",
  },
  {
    q: "How is this different from the last consultant who disappointed me?",
    a: "You'll know inside the first week whether this is working, because you'll be looking at working software rather than a progress report. If it isn't going where you want, you find that out early enough to change it — not at the end, when the budget is gone.",
  },
  {
    q: "What does this actually cost?",
    a: "It depends entirely on which path fits, and I'd rather scope it honestly than quote a number at someone I haven't listened to yet. What I will say plainly: this is a senior engineering engagement, priced like one, and it's the wrong fit if you're looking for the cheapest option. The intro call is where we find out whether it's worth either of our time.",
  },
  {
    q: "What happens on the call?",
    a: "You tell me where your week disappears. I tell you straight whether I can help, and what I'd do first. If there's a fit, we talk about which path makes sense. If there isn't, you'll leave with at least one thing you can act on yourself.",
  },
];

/** Risk reversal — the existing Measurable Progress Guarantee, in the letter's voice. */
export const GUARANTEE = {
  heading: "The guarantee",
  body: "If you implement the system we build and don't see measurable improvement within thirty days — hours saved, leads generated, revenue moved — I'll do a follow-up session at no cost to put it right. I'd rather fix it than keep the fee.",
};

/** The recurring call-to-action, used after each major beat. */
export const CTA = {
  primary: "Book an intro call",
  secondary: "Assess where you are now",
  closingHeading: "Where this starts",
  closingBody:
    "One conversation. You describe where the week goes; I tell you what I'd fix first and whether I'm the right person to fix it.",
};
