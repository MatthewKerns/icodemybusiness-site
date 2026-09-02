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
  headline: "Most businesses don't need more software. They need the right three things fixed.",
  subhead:
    "I'm Matthew Kerns. I build the systems that take the manual, repetitive, forgettable work off a business owner's plate — and I start by finding out what's actually costing you, not by selling you a package.",
};

/** The problem beat — named, specific, recognisable. */
export const PROBLEM = {
  heading: "You already know something is leaking",
  body: [
    "You can feel it in the week. Work that should take an hour takes a day. The same question gets answered three times by three people. A customer falls through a gap nobody owned. You've bought tools to fix it and the tools became another thing to manage.",
    "The usual advice is to add software. More often the real problem is that nobody has mapped where the hours actually go — so every fix lands in the wrong place, and the business pays for it twice.",
  ],
};

/** Credibility, told as a way of working rather than a résumé. */
export const STORY = {
  heading: "How I work, and why it's different",
  body: [
    "Most consultants give you a slide deck and an invoice. I give you a working system.",
    "Before a real engagement starts, I spend hours inside your business — your workflows, your industry, your competitors — so the first working session is execution, not discovery. I write the architecture myself, use AI to build faster, and review every line. You get senior engineering end to end, not a junior team billed at senior rates.",
    "Then you see software every week. Not wireframes, not status decks — something your team can actually use. That rhythm is the whole method: short loops, visible progress, and a system you can run without me.",
  ],
  proofPoints: [
    {
      label: "Working software weekly",
      detail:
        "Every engagement ships something usable each week. If a week produces only a status update, that's a failure, and I treat it as one.",
    },
    {
      label: "I do the work",
      detail:
        "No account manager, no handoff to a junior team. The person who scopes your system is the person who builds it.",
    },
    {
      label: "You own what I build",
      detail:
        "Architecture, code, and the plain-language explanation of how it runs. Nothing is designed to keep you dependent on me.",
    },
  ],
};

/**
 * The four routes in. Presented as a diagnosis — "which one is you" — rather
 * than a menu, so the reader's own situation picks the path for them.
 *
 * `commitment` is the tier signal: it's how the reader works out this is a
 * serious engagement without a number ever appearing.
 */
export const PATHS = [
  {
    key: "diagnostic",
    name: "Start with a diagnosis",
    forWho: "You know something's wrong, but not what to fix first.",
    what: "We find the three things costing you the most time and money right now, in your actual workflows — and you get the write-up whether or not we go further.",
    timeline: "A few minutes on the assessment, then a call",
    commitment: "Free. This is where most people should start.",
    highlight: true,
  },
  {
    key: "build",
    name: "Have it built for you",
    forWho: "You already know what needs to exist, and you want it built properly the first time.",
    what: "A defined scope with a fixed shape: architecture, weekly working software, and a system your team runs afterwards. I build it; you own it.",
    timeline: "Typically six to twelve weeks",
    commitment: "A defined project engagement, scoped on the call.",
    highlight: false,
  },
  {
    key: "fractional",
    name: "Bring me inside the business",
    forWho: "This isn't one project — you need the capability in-house, permanently.",
    what: "I work as your engineering and AI partner: setting direction, building, and levelling up whoever you already have. The role a senior hire would fill, without the search or the seat.",
    timeline: "Ongoing, reviewed each quarter",
    commitment: "A monthly retainer, capacity-limited — I hold very few of these at once.",
    highlight: false,
  },
  {
    key: "program",
    name: "Rebuild how the business runs",
    forWho: "The back office is the bottleneck and you want it structurally different, not patched.",
    what: "A defined outcome with a start and an end: the manual core of your operation replaced by systems that run themselves, with your team trained to keep them running.",
    timeline: "A defined ninety-day program",
    commitment: "The deepest engagement I offer. A handful a year.",
    highlight: false,
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
    a: "Two things. I research your business before the first working session, so we skip discovery. And you see working software every week — which means you find out early if it isn't going well, instead of at the end.",
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
