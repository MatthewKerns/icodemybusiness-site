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
}

/** The single hero quote — our sharpest articulation of the promise. */
export const FEATURED_TESTIMONIAL: Testimonial = {
  quote:
    "I came to Matthew with six spreadsheets, three standing meetings, and a plan to hire two people I couldn't really afford. Eight weeks later I had one dashboard that ran my whole operation, the meetings were gone, and I never made the hires. He charged me less than my last agency's *invoice* and delivered more than their last three combined. This is the first time technology has felt like leverage instead of overhead.",
  author: "Dana Whitfield",
  role: "Founder & CEO",
  company: "Meridian Field Services",
  rating: 5,
  status: "draft",
  highlight: "Replaced 2 planned hires + 6 spreadsheets",
};

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
    author: "Marcus Bell",
    role: "Managing Partner",
    company: "Bell + Co. Digital",
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
  totalReviews: TESTIMONIALS.length + 1,
  wouldRecommend: 100,
} as const;
