/**
 * Shared vocabulary for the email pipeline in /admin/email: the stages a person
 * moves through, the categories a reply is filed under, and the states a
 * sending inbox can be in. Validators and plain lists live together so the
 * schema, the functions and the UI cannot drift apart.
 */

import { v } from "convex/values";

export const PIPELINE_STAGES = [
  "new",
  "contacted",
  "replied",
  "interested",
  "booked",
  "won",
  "lost",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const pipelineStage = v.union(
  v.literal("new"),
  v.literal("contacted"),
  v.literal("replied"),
  v.literal("interested"),
  v.literal("booked"),
  v.literal("won"),
  v.literal("lost")
);

/**
 * The eleven reply labels from the coldoutboundskills positive-reply-scoring
 * skill (MIT, (c) 2026 GrowthEngineX — see THIRD_PARTY_NOTICES.md), kept
 * verbatim so numbers here mean what they mean there.
 */
export const REPLY_CATEGORIES = [
  "positive_interested",
  "positive_soft",
  "positive_referral",
  "neutral_question",
  "negative_notnow",
  "negative_notfit",
  "negative_hostile",
  "unsubscribe",
  "ooo",
  "bounce",
  "other",
] as const;
export type ReplyCategory = (typeof REPLY_CATEGORIES)[number];

export const replyCategory = v.union(
  v.literal("positive_interested"),
  v.literal("positive_soft"),
  v.literal("positive_referral"),
  v.literal("neutral_question"),
  v.literal("negative_notnow"),
  v.literal("negative_notfit"),
  v.literal("negative_hostile"),
  v.literal("unsubscribe"),
  v.literal("ooo"),
  v.literal("bounce"),
  v.literal("other")
);

/** Counted as positive in the positive reply rate. */
export const POSITIVE_REPLY_CATEGORIES: ReadonlySet<ReplyCategory> = new Set<ReplyCategory>([
  "positive_interested",
  "positive_soft",
  "positive_referral",
]);

/** Auto-replies and delivery failures: not a person answering. */
export const NON_REPLY_CATEGORIES: ReadonlySet<ReplyCategory> = new Set<ReplyCategory>(["ooo", "bounce"]);

/** Replies that someone has to answer. Everything else is filed as handled. */
export const NEEDS_ANSWER_CATEGORIES: ReadonlySet<ReplyCategory> = new Set<ReplyCategory>([
  "positive_interested",
  "positive_soft",
  "positive_referral",
  "neutral_question",
  "negative_hostile",
  "other",
]);

export const INBOX_STATUSES = [
  "warming",
  "ready",
  "sending",
  "resting",
  "flagged",
  "retired",
] as const;
export type InboxStatus = (typeof INBOX_STATUSES)[number];

export const inboxStatus = v.union(
  v.literal("warming"),
  v.literal("ready"),
  v.literal("sending"),
  v.literal("resting"),
  v.literal("flagged"),
  v.literal("retired")
);

/**
 * Backup inboxes to keep warming or ready at all times, so a flagged or
 * undeliverable address can be swapped out without waiting on a fresh warm-up.
 * Matthew's rule, 2026-11-09 (from Aaron): always 3-5, even when not needed.
 */
export const BACKUP_INBOX_MIN = 3;
export const BACKUP_INBOX_MAX = 5;

/** An inbox counts as a backup while it is warming or warmed-and-idle. */
export function isBackupInbox(status: InboxStatus): boolean {
  return status === "warming" || status === "ready";
}
