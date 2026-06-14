/**
 * ============================================================================
 * MANGO SYNC — recalibration seam for testimonials (DRAFT / NOT WIRED LIVE)
 * ============================================================================
 *
 * "Mango tools" = Matthew's weekly-refined software-contractor toolset. The
 * intent is for the testimonials on this page to recalibrate automatically:
 * as engagements close, mango pushes verified quotes + fresh aggregate stats
 * over MCP (or a thin REST endpoint), replacing the North-Star drafts.
 *
 * This module is the single integration point for that. Today it is a
 * pass-through that returns the local drafts so the page renders without any
 * network dependency. When the mango endpoint is ready, implement
 * `fetchMangoTestimonials()` and flip `MANGO_SYNC_ENABLED`.
 *
 * Contract (proposed):
 *   GET  ${MANGO_API_URL}/testimonials   ->  { featured, testimonials, stats }
 *   or MCP tool  mango.testimonials.list  ->  same shape
 *   Only entries with status === "verified" should ever be shown publicly.
 */

import {
  FEATURED_TESTIMONIAL,
  TESTIMONIALS,
  TESTIMONIAL_STATS,
  type Testimonial,
} from "./testimonials-data";

export interface TestimonialFeed {
  featured: Testimonial;
  testimonials: Testimonial[];
  stats: typeof TESTIMONIAL_STATS;
  /** Where this data came from, so the UI can label drafts vs. live. */
  source: "local-draft" | "mango";
}

/** Master switch. Stays false until the mango endpoint is live + trusted. */
export const MANGO_SYNC_ENABLED = false;

/**
 * Resolve the testimonial feed. Falls back to local drafts on any failure so
 * the page never breaks because of an upstream issue.
 */
export async function getTestimonialFeed(): Promise<TestimonialFeed> {
  if (MANGO_SYNC_ENABLED) {
    try {
      return await fetchMangoTestimonials();
    } catch (err) {
      // Recalibration is best-effort; drafts are the safe default.
      console.error("[mango-sync] falling back to local drafts:", err);
    }
  }

  return {
    featured: FEATURED_TESTIMONIAL,
    testimonials: TESTIMONIALS,
    stats: TESTIMONIAL_STATS,
    source: "local-draft",
  };
}

/**
 * TODO(mango): implement against the mango MCP tool or REST endpoint.
 * Must filter to status === "verified" before returning for public display.
 */
async function fetchMangoTestimonials(): Promise<TestimonialFeed> {
  throw new Error("mango-sync not yet implemented");
}
