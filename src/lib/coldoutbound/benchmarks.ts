/**
 * Campaign health rules from coldoutboundskills (MIT, (c) 2026 GrowthEngineX —
 * THIRD_PARTY_NOTICES.md). Each number names the file it came from. Where the
 * repo's own docs disagree, the stricter script value is used and the choice
 * is noted, so a verdict here never flatters a campaign.
 */

/** Sends before a reply rate means anything — email-deliverability-audit. */
export const MIN_SENDS_REPLY = 200;
/** Sends before a bounce rate means anything — audit-performance.ts. */
export const MIN_SENDS_BOUNCE = 50;
/** Below this, positive reply rate is noise — positive-reply-scoring. */
export const MIN_SENDS_POSITIVE = 500;
/** Days before a campaign is judged — weekly-rhythm, experiment-design. */
export const JUDGE_AFTER_DAYS = 21;
/** Cold sends per inbox per day, post warm-up — starter-kit 01. */
export const SENDS_PER_INBOX_PER_DAY = 30;
/** Minimum warm-up before an inbox sends — starter-kit 01. */
export const WARMUP_MIN_DAYS = 14;

export type Verdict = "good" | "ok" | "warn" | "bad" | "wait";

export interface Finding {
  metric: "reply" | "positive" | "bounce" | "hostile" | "unsubscribe";
  verdict: Verdict;
  /** The measured rate as a fraction, or null when there is nothing to divide. */
  rate: number | null;
  message: string;
}

export interface CampaignNumbers {
  sent: number | null;
  bounced: number | null;
  /** People who replied, excluding auto-replies and bounces. */
  replied: number;
  positive: number;
  hostile: number;
  unsubscribed: number;
}

const pct = (r: number) => `${(r * 100).toFixed(1)}%`;

/**
 * Judge one campaign. Returns one finding per metric; `wait` means the sample
 * is below the floor and no verdict is offered rather than a guess.
 */
export function judgeCampaign(n: CampaignNumbers): Finding[] {
  const sent = n.sent ?? 0;
  if (sent <= 0) {
    return [
      {
        metric: "reply",
        verdict: "wait",
        rate: null,
        message: "No sent total yet. Copy it in from the sending tool to get a verdict.",
      },
    ];
  }
  const out: Finding[] = [];

  const reply = n.replied / sent;
  if (sent < MIN_SENDS_REPLY) {
    out.push({
      metric: "reply",
      verdict: "wait",
      rate: reply,
      message: `${sent} sent. Reply rate is judged from ${MIN_SENDS_REPLY} sends.`,
    });
  } else if (reply >= 0.015) {
    out.push({ metric: "reply", verdict: "good", rate: reply, message: `Reply rate ${pct(reply)}: good (1.5% or more).` });
  } else if (reply >= 0.01) {
    out.push({ metric: "reply", verdict: "ok", rate: reply, message: `Reply rate ${pct(reply)}: healthy (1% or more).` });
  } else {
    out.push({
      metric: "reply",
      verdict: "bad",
      rate: reply,
      message: `Reply rate ${pct(reply)} is under the 1% line after ${sent} sends. Check deliverability before changing copy.`,
    });
  }

  const positive = n.positive / sent;
  if (sent < MIN_SENDS_POSITIVE) {
    out.push({
      metric: "positive",
      verdict: "wait",
      rate: positive,
      message: `Positive reply rate is noise under ${MIN_SENDS_POSITIVE} sends.`,
    });
  } else if (positive >= 0.02) {
    out.push({ metric: "positive", verdict: "good", rate: positive, message: `Positive reply rate ${pct(positive)}: great (2% or more).` });
  } else if (positive >= 0.01) {
    out.push({ metric: "positive", verdict: "ok", rate: positive, message: `Positive reply rate ${pct(positive)}: good (1% or more).` });
  } else {
    out.push({ metric: "positive", verdict: "warn", rate: positive, message: `Positive reply rate ${pct(positive)} is under 1%.` });
  }

  if (n.bounced !== null) {
    const bounce = n.bounced / sent;
    if (sent < MIN_SENDS_BOUNCE) {
      out.push({ metric: "bounce", verdict: "wait", rate: bounce, message: `Bounce rate is judged from ${MIN_SENDS_BOUNCE} sends.` });
    } else if (bounce > 0.05) {
      out.push({ metric: "bounce", verdict: "bad", rate: bounce, message: `Bounce rate ${pct(bounce)} is over 5%. Stop the campaign now, then find out why.` });
    } else if (bounce > 0.03) {
      out.push({ metric: "bounce", verdict: "bad", rate: bounce, message: `Bounce rate ${pct(bounce)} is over 3%. Pause it and re-verify the list.` });
    } else if (bounce > 0.02) {
      out.push({ metric: "bounce", verdict: "warn", rate: bounce, message: `Bounce rate ${pct(bounce)} is over 2%. Check the list.` });
    } else {
      out.push({ metric: "bounce", verdict: bounce < 0.01 ? "good" : "ok", rate: bounce, message: `Bounce rate ${pct(bounce)}.` });
    }
  }

  // positive-reply-scoring: either of these is a deliverability risk — pause.
  const hostile = n.hostile / sent;
  if (hostile > 0.003) {
    out.push({ metric: "hostile", verdict: "bad", rate: hostile, message: `Hostile replies at ${pct(hostile)} of sent (over 0.3%). Pause and look at who this is going to.` });
  }
  const unsub = n.unsubscribed / sent;
  if (unsub > 0.02) {
    out.push({ metric: "unsubscribe", verdict: "bad", rate: unsub, message: `Unsubscribes at ${pct(unsub)} of sent (over 2%). Pause the campaign.` });
  }
  return out;
}

/** The worst verdict in a set, for a single status dot. */
export function worstVerdict(findings: Finding[]): Verdict {
  const order: Verdict[] = ["bad", "warn", "wait", "ok", "good"];
  for (const v of order) if (findings.some((f) => f.verdict === v)) return v;
  return "wait";
}

/** The weekly operating rhythm — cold-email-weekly-rhythm. `day`: 1 = Monday. */
export const WEEKLY_RHYTHM: ReadonlyArray<{ day: number; title: string; what: string }> = [
  {
    day: 1,
    title: "Deliverability check",
    what: "Reply rate at or above 1% on every campaign past 200 sends; bounce at or under 2%. Over 3% bounce: pause, then find out why.",
  },
  {
    day: 3,
    title: "Reply sweep",
    what: "Go through every reply from the last 7 days. Answer the interested ones first, follow up referrals within a day, remove anyone hostile from everything.",
  },
  {
    day: 5,
    title: "Campaign retrospective",
    what: "For campaigns reaching day 21: keep at 2x the baseline positive reply rate, kill under half of it, otherwise change one thing and re-run.",
  },
];
