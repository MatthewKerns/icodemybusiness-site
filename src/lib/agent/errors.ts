/**
 * Turn an upstream failure (Anthropic, Convex, network) into a message that is
 * safe and useful to show a visitor. The real error is logged server-side.
 */
export function visitorSafeAgentError(err: unknown, context: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  console.error(`[agent:${context}]`, raw);
  const status = (err as { status?: number } | null)?.status;
  if (status === 429 || status === 529 || /overloaded|rate.?limit/i.test(raw)) {
    return "The assistant is busy right now. Give it a few seconds and send that again.";
  }
  return "The assistant is temporarily unavailable. Please try again in a few minutes - or book a call and I'll go through it with you directly.";
}
