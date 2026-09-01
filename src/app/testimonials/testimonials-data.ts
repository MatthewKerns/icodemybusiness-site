/**
 * ============================================================================
 * TESTIMONIALS — STRATEGIC DRAFT / NORTH STAR (DO NOT SHIP AS REAL CLAIMS)
 * ============================================================================
 *
 * These are *aspirational* five-star testimonials. They describe the outcomes
 * iCodeMyBusiness intends to consistently deliver — the bar we are building
 * toward — not yet-verified client quotes. They exist to align copy, design,
 * and positioning around a clear North Star.
 *
 * ⚠️  This page is intentionally gated and must NOT be deployed or indexed
 *     until each quote is replaced with a real, attributable, consented
 *     client testimonial. See `page.tsx` for the draft gate.
 *
 * RECALIBRATION:
 *   This dataset is designed to be refreshed automatically by the "mango
 *   tools" (Matthew's weekly-refined software-contractor toolset) over MCP /
 *   API. As real engagements close, the mango sync replaces draft entries
 *   with verified ones and updates the aggregate stats. The seam for that
 *   lives in `mango-sync.ts` — today it returns the drafts below unchanged.
 */

export type TestimonialStatus = "draft" | "pending-consent" | "verified";

export interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company?: string;
  rating: number;
  /** Provenance so verified quotes can be distinguished from North-Star drafts. */
  status: TestimonialStatus;
  /** Headline result, surfaced as a chip on the card. */
  highlight?: string;
  /**
   * Path to the person's photo (e.g. "/testimonials/dana-whitfield.jpg",
   * served from /public). Left undefined for drafts — the UI renders a gold
   * initials avatar in the same slot until a real headshot is dropped in.
   */
  image?: string;
}

/**
 * The two hero quotes — our sharpest articulations of the promise. These get
 * the big, photo-forward showcase treatment at the top of the page.
 */
export const FEATURED_TESTIMONIALS: Testimonial[] = [
  {
    // Grounded in Trevor's own words from the 2025-11-28 Fathom call
    // (fathom.video/calls/489556539): "you're the expert in this space",
    // "coding isn't my world", the build brings "a whole ton of credibility",
    // and "I'm really excited by getting this live ... help people in ways
    // they're struggling with". Idealized into a single testimonial.
    quote:
      "I came to Matt with deep domain expertise and a rough app idea, and he turned it into a real, Claude-powered tool — one that captures sign-ups and delivers my brand-analysis and repositioning framework to the people who need it. What made the difference is that Matt isn't only a developer: he's run his own private-label ecommerce brand, so he actually understood my world. That rare combination of ecommerce owner and software developer cut months off the path to a profitable product. Coding isn't my world, so every conversation I was learning — Matt is genuinely the expert in this space, right down to the credibility he built into the product. There was real uncertainty along the way, but he kept moving it forward, always, with a professionalism and work rate I haven't seen anywhere else. I'm so excited to get this live.",
    author: "Trevor Bradford",
    role: "Ecommerce Brand Owner & Founder Advisor",
    company: "",
    rating: 5,
    status: "draft",
    highlight: "Ecommerce + dev combo cut months off launch",
    image: undefined, // /testimonials/trevor-bradford.jpg
  },
  {
    quote:
      "Ten years ago I was a professional software developer myself, so I don't hand out praise like this lightly. And as an ecommerce brand owner who now advises other founders, I can tell you Matt's edge is genuinely rare: he's run his own private-label brand and he can build the software — and that combination massively shortened our timeline to a profitable product. Give him a simple target and he stays on task and on point with little to no instruction. He thinks outside the box and skates to where the puck is going, not where it is — always on top of the latest releases and what's happening in the space. And he's a massive value-add beyond the code: he lifts the morale of the whole team and is a true leader who asks the right questions so we all grow together toward the objective.",
    author: "Andrew Erickson",
    role: "Ecommerce Brand Owner & Advisor · Former Software Engineer",
    company: "",
    rating: 5,
    status: "draft",
    highlight: "Private-label + dev = faster path to profit",
    image: undefined, // /testimonials/andrew-erickson.jpg
  },
];

/** Supporting wall of proof. Each maps to a real capability we sell. */
export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "We record one 20-minute voice memo on Monday and by Tuesday we have a week of LinkedIn posts, a newsletter, and a blog draft — all in our voice. Our content output went 5x and I got my Sunday nights back. Matthew didn't just build a tool, he built our whole content engine.",
    author: "Priya Raman",
    role: "Solo Consultant",
    company: "Raman Advisory",
    rating: 5,
    status: "draft",
    highlight: "5x content, 80% less writing time",
  },
  {
    quote:
      "The process audit paid for itself before we wrote a single line of code. He mapped 23 workflows and found $47K a year we were quietly burning on work software could do. Then he automated the top three in a month. I've worked with $300/hr firms that never once told me the truth this plainly.",
    author: "Sofia Ndiaye",
    role: "Managing Partner",
    company: "Atlas Creative Group",
    rating: 5,
    status: "draft",
    highlight: "$47K/yr in waste found in 2 weeks",
  },
  {
    quote:
      "Every Friday I see working software — not wireframes, not status decks, software my team can actually use. Senior, Amazon-trained engineering at a rate I had to read twice. The weekly sprint rhythm completely rebuilt my trust in hiring developers.",
    author: "Elena Vásquez",
    role: "COO",
    company: "Northwind Logistics",
    rating: 5,
    status: "draft",
    highlight: "Working software shipped every week",
  },
  {
    quote:
      "Our L10s used to run 90 minutes of arguing about whose numbers were right. Now the scorecard is live, accurate to the dollar, and the meeting takes 60 minutes of actual decisions. Matthew understands EOS as well as he understands code, which is a rare and dangerous combination — in the best way.",
    author: "Grant Okafor",
    role: "Integrator",
    company: "Lumen Built",
    rating: 5,
    status: "draft",
    highlight: "Scorecard accuracy 70% → 99%",
  },
  {
    quote:
      "I subscribed expecting a tool-of-the-month. What I got was a standing engineering partner who ships improvements before I even ask. The free tools alone are better than things I've paid four figures for. The subscription is the easiest line item I approve every month.",
    author: "Hailey Brooks",
    role: "Owner",
    company: "Brooks Wellness Studio",
    rating: 5,
    status: "draft",
    highlight: "Easiest recurring spend in the budget",
  },
  {
    quote:
      "What sold me wasn't the AI buzzwords — it was that he reviews every line and the thing just works in the real world, not just the demo. 30 days of follow-up turned into a relationship. When people ask who builds our software, I say Matthew, and I say it like it's a flex. Because it is.",
    author: "Theo Lindqvist",
    role: "Founder",
    company: "Cadence Labs",
    rating: 5,
    status: "draft",
    highlight: "Senior quality, reviewed line by line",
  },
];

/** Aggregate stats — also recalibrated by the mango sync as quotes verify. */
export const TESTIMONIAL_STATS = {
  averageRating: 5.0,
  totalReviews: TESTIMONIALS.length + FEATURED_TESTIMONIALS.length,
  wouldRecommend: 100,
} as const;
