/**
 * The hand-off from a finished discovery assessment to the booking page.
 * `/book` reads these params to prefill Calendly and tags the booking with
 * the session id (utm_content) so it can be matched to the report.
 *
 * Lives in lib rather than the component so pages can import it without
 * touching `@/components/agent/*` (restricted by the ESLint phase rule).
 */
export function bookingHref(a: {
  sessionId: string;
  email: string;
  name?: string;
}): string {
  const params = new URLSearchParams({ session: a.sessionId, email: a.email });
  if (a.name) params.set("name", a.name);
  return `/book?${params.toString()}`;
}
