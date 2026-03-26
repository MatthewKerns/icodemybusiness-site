import {
  LEAD_SCORE_REFERRAL,
  LEAD_SCORE_YOUTUBE,
  LEAD_SCORE_DEFAULT,
} from "./constants";

/**
 * Pure lead scoring function. Zero npm dependencies (Convex-safe).
 * Scoring values are centralized in ./constants.
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
