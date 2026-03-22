/**
 * Pure lead scoring function. Zero npm dependencies.
 * Duplicated from convex/lib/leadScoring.ts for client-side use
 * (Convex functions cannot import from src/ via @ aliases).
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
