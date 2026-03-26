/**
 * Parse a Convex error into a user-friendly message string.
 *
 * Convex throws errors with a `data` property that can be either:
 *   - An object with `kind` and `message` (e.g. rate-limit errors)
 *   - A plain string
 *
 * This helper encapsulates the brittle type-narrowing so callers
 * don't need to repeat it.
 */
export function parseConvexError(error: unknown): string {
  if (!(error instanceof Error) || !("data" in error)) {
    return "Something went wrong. Please try again.";
  }

  const { data } = error as Error & { data: unknown };

  // Object-shaped data — e.g. { kind: "RateLimited", message: "..." }
  if (typeof data === "object" && data !== null) {
    const record = data as { kind?: string; message?: string };
    if (record.kind === "RateLimited") {
      return record.message ?? "Too many attempts. Please try again in a moment.";
    }
  }

  // String-shaped data — a direct error message from the mutation
  if (typeof data === "string") {
    return data;
  }

  return "Something went wrong. Please try again.";
}

/**
 * Parse a Stripe error into a user-friendly message string.
 *
 * Stripe errors typically have a `type` and `message` property.
 * Common types include:
 *   - card_error: Card was declined
 *   - validation_error: Invalid parameters
 *   - api_error: Stripe API error
 *   - rate_limit_error: Too many requests
 *
 * This helper provides user-friendly messages for common Stripe error scenarios.
 */
export function parseStripeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Payment processing failed. Please try again.";
  }

  const stripeError = error as Error & {
    type?: string;
    code?: string;
    decline_code?: string;
  };

  // Handle specific Stripe error types
  if (stripeError.type === "card_error") {
    if (stripeError.decline_code) {
      switch (stripeError.decline_code) {
        case "insufficient_funds":
          return "Your card has insufficient funds.";
        case "card_not_supported":
          return "This card is not supported. Please try a different card.";
        case "expired_card":
          return "Your card has expired. Please use a different card.";
        default:
          return "Your card was declined. Please try a different payment method.";
      }
    }
    return error.message || "Your card was declined. Please try a different payment method.";
  }

  if (stripeError.type === "rate_limit_error") {
    return "Too many payment attempts. Please wait a moment and try again.";
  }

  if (stripeError.type === "validation_error") {
    return error.message || "Payment information is invalid. Please check your details.";
  }

  if (stripeError.type === "api_error") {
    return "Payment service temporarily unavailable. Please try again.";
  }

  // Default to error message or generic fallback
  return error.message || "Payment processing failed. Please try again.";
}
