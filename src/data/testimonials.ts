// Staged testimonials — NOT published.
//
// These are *target* testimonials (the outcome we're working to earn), not real
// client quotes yet. Do NOT render publicly until the real testimonial is given
// and approved. When ready: flip `published` to true (the `testimonials` export
// below picks it up), then pass `testimonials` to <TestimonialSection> on the
// relevant page (e.g. src/app/page.tsx or /consulting). Mirrors the
// "Trevor testimonial" target on Mango rock-3.

export interface StagedTestimonial {
  quote: string;
  author: string;
  role: string;
  rating?: number;
  /** false = staged/draft target — must not be shown publicly. */
  published: boolean;
}

export const stagedTestimonials: StagedTestimonial[] = [
  {
    quote:
      "Matthew took my framework from a book to a working product in weeks — measurable progress every week. He doesn't just code; he gets the brand. He ships.",
    author: "Trevor Bradford",
    role: "Creator, IDEA Brand framework",
    published: false, // DRAFT TARGET — awaiting Trevor's real testimonial
  },
];

// Live feed for <TestimonialSection testimonials={testimonials} />.
// Empty until a staged entry is approved (flip `published` above).
export const testimonials = stagedTestimonials.filter((t) => t.published);
