# src/app/api/ — area rules

- Wrap every handler in `withErrorHandler` (`src/lib/api-error-handler.ts`): it logs to Sentry and
  emits PostHog `api_error` for 5xx. Throw `ValidationError` / `AuthError` / `ApiError` / `InternalError`.
- **Never forward an upstream error to the visitor.** Streaming agent routes use
  `visitorSafeAgentError(err, "<route>")` from `src/lib/agent/errors.ts` in the stream `catch`.
- Anthropic/Resend/Convex clients are created inside the route (`getConvexClient()`, `new Resend(key)`);
  keys come from the VPS runtime env — never `NEXT_PUBLIC_*`, never shipped to the client.
- Unauthenticated routes must be gated on something the visitor already did (e.g. `/api/email/welcome`
  requires an existing `leads` row) so they cannot be used as open relays.
- After any Resend call, `convex.mutation(api.emailSends.record, …)` — best-effort, never fails the request.
- `NEXT_PUBLIC_*` values are baked at build time on the VPS; changing one needs a rebuild and a
  `--build-arg` line in the VPS `deploy.sh`.
