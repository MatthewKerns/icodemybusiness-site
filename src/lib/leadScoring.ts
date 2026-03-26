import {
  LEAD_SCORE_REFERRAL,
  LEAD_SCORE_YOUTUBE,
  LEAD_SCORE_DEFAULT,
} from "./constants";

/**
 * Pure lead scoring function. Zero npm dependencies.
 * Duplicated from convex/lib/leadScoring.ts for client-side use
 * (Convex functions cannot import from src/ via @ aliases).
 */
export function scoreLead(source?: string): number {
  switch (source) {
    case "referral":
      return LEAD_SCORE_REFERRAL;
    case "youtube":
      return LEAD_SCORE_YOUTUBE;
    default:
      return LEAD_SCORE_DEFAULT;
  }
}
