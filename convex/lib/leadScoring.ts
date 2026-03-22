/**
 * Pure lead scoring function. Zero npm dependencies (Convex-safe).
 */
export function scoreLead(source?: string): number {
  switch (source) {
    case "referral":
      return 15;
    case "youtube":
      return 10;
    default:
      return 5;
  }
}
