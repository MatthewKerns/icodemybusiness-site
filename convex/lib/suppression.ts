/**
 * The send gate.
 *
 * `assertSendable` is called inside `sequenceEngine.claimStep`, inside the
 * transaction, BEFORE the dedupe row is written. That ordering is the whole
 * guarantee: a send action has no way to obtain a `dedupeKey` except through
 * `claimStep`, and `completeStep` refuses a send id that is not in `claimed`
 * state — so nothing can route around this function.
 */

import type { QueryCtx } from "../_generated/server";

/** Why a send was refused. `null` means it may proceed. */
export type SendBlock =
  | { kind: "suppressed"; reason: string; scope: "all" | "marketing" }
  | { kind: "no-consent" }
  | { kind: "paused" };

export type SendScope = "marketing" | "transactional";

/**
 * An address is suppressed if it has any un-revoked row whose scope covers the
 * send. "marketing" suppression stops nurture but NOT the report a visitor
 * explicitly asked for; "all" (hard bounce, spam complaint) stops everything,
 * because continuing to send damages the sending domain.
 */
export async function findSuppression(
  ctx: QueryCtx,
  email: string,
  scope: SendScope
): Promise<SendBlock | null> {
  const rows = await ctx.db
    .query("emailSuppressions")
    .withIndex("by_email", (q) => q.eq("email", email))
    .collect();

  for (const row of rows) {
    if (row.revokedAt !== undefined) continue;
    if (row.scope === "all" || scope === "marketing") {
      return { kind: "suppressed", reason: row.reason, scope: row.scope };
    }
  }
  return null;
}

/**
 * Marketing consent. Absent is NOT "unknown" — it is "no".
 *
 * Matthew's ruling, 2026-09-04: every capture form gets an explicit consent
 * line and `leads` gets `consentedAt`/`consentSource`; every address captured
 * before that shipped is held out of sequences rather than assumed in. The
 * cmo session raised it — no capture on the site promises an email series,
 * only a specific deliverable, so enrolling those addresses would deliver
 * something nobody asked for (copy-principles §3).
 */
export async function hasMarketingConsent(
  ctx: QueryCtx,
  email: string
): Promise<boolean> {
  const lead = await ctx.db
    .query("leads")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  return lead?.consentedAt !== undefined;
}

/** The global kill switch, so all sending can stop without a deploy. */
export async function sequencesPaused(ctx: QueryCtx): Promise<boolean> {
  const settings = await ctx.db
    .query("ownerSettings")
    .withIndex("by_key", (q) => q.eq("key", "owner"))
    .first();
  // Default to PAUSED when no settings row exists. A missing row must never
  // mean "send freely" — the safe failure for a mailer is silence.
  return settings?.sequencesPaused ?? true;
}

/**
 * Full gate for one sequence step. Returns null when the send may proceed,
 * otherwise the reason it may not.
 */
export async function assertSendable(
  ctx: QueryCtx,
  email: string
): Promise<SendBlock | null> {
  if (await sequencesPaused(ctx)) return { kind: "paused" };
  const suppressed = await findSuppression(ctx, email, "marketing");
  if (suppressed) return suppressed;
  if (!(await hasMarketingConsent(ctx, email))) return { kind: "no-consent" };
  return null;
}
