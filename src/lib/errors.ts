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
