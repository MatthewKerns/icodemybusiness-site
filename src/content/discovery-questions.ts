/**
 * The Discovery Assessment: five fixed questions, asked in order.
 *
 * Generalised from the 5-Questions intake framework in
 * skill-packages/ecommerce-brand-automation-audit/ecommerce-intake/references/
 * 5-questions-framework.md, voiced to match the homepage letter
 * (src/content/landing.ts): "where your week goes", manual, repetitive work.
 *
 * The UI renders `anchor` verbatim when a stage opens. The model never asks
 * the anchor; it only asks a drill-down when the answer is vague and then
 * extracts a structured answer. `alternates` and `listenFor` are fed to the
 * model as guidance for that drill-down.
 *
 * Standing constraints (docs/ROADMAP.md): no prices anywhere (R-009), no
 * reassurance-shaped copy (R-008).
 */

export type DiscoveryQuestionKey =
  | "problem"
  | "cost"
  | "history"
  | "stakes"
  | "outcome";

export interface DiscoveryQuestion {
  key: DiscoveryQuestionKey;
  /** Short label for the stepper pills. Kept short: the pill row must fit a phone. */
  label: string;
  /**
   * The long visitor-facing label, used wherever an answer is shown under a
   * heading of its own: the recap rows, the report card, the report email.
   * Separate from `label` because the stepper cannot afford the extra width.
   */
  rowLabel: string;
  /** The one question the UI asks when the stage opens. */
  anchor: string;
  /** Other ways to put it, for the model's drill-down. */
  alternates: string[];
  /** What a good answer contains, and what to do when it's missing. */
  listenFor: string;
}

export const DISCOVERY_QUESTIONS: readonly DiscoveryQuestion[] = [
  {
    key: "problem",
    label: "The problem",
    rowLabel: "The problem",
    anchor: "What's your biggest frustration in the business right now?",
    alternates: [
      "What's the biggest thing eating your week right now?",
      "What do you know could be better in your organization?",
      "What's the one problem that keeps coming back?",
      "Where does your week actually go?",
    ],
    listenFor:
      "A specific, recurring problem in their own words: the manual or repetitive work, the handoff that breaks, the thing they redo. Asking for a frustration rather than a diagnosis gets a long, unstructured answer on purpose — take the recurring workflow out of it rather than recording the mood. Push past a vague answer once. If they are not frustrated, do not accept \"nothing\": ask what they know could be better in the organization, which people name as an improvement when they would never name it as a complaint.",
  },
  {
    key: "cost",
    label: "What it costs",
    rowLabel: "What it costs",
    anchor:
      "Roughly what is that costing you each month, in dollars or in hours you can put a number on?",
    alternates: [
      "If you had to put a number on it, what's that costing you a month?",
      "How many hours a week go to work that could run itself?",
      "What does doing it the way you do it now cost you in lost revenue or rework?",
    ],
    listenFor:
      "A dollar figure or an hours figure, even rough. Never invent one. If they genuinely don't know, say that building that baseline is part of the value and record the cost as unknown rather than guessing.",
  },
  {
    key: "history",
    label: "How long",
    rowLabel: "How long, and what you've tried",
    anchor: "How long has this been going on, and what have you already tried?",
    alternates: [
      "When did this start, and has anything you've tried actually moved it?",
      "Is it getting better, worse, or staying flat?",
      "What has stopped you fixing it before now?",
    ],
    listenFor:
      "Chronicity and history: new or years old, what was tried, whether it helped, what got in the way. 'Tried everything' is worth one gentle follow-up about what specifically.",
  },
  {
    key: "stakes",
    label: "If nothing changes",
    rowLabel: "If nothing changes",
    anchor:
      "If nothing changes, where does this leave the business in six to twelve months?",
    alternates: [
      "What does doing nothing cost you over the next year?",
      "What happens to your ability to grow if this keeps going?",
      "What is the real risk if you just let it ride?",
    ],
    listenFor:
      "The cost of inaction in their words: a growth ceiling, burnout, churn, cash pressure, a missed window. Urgency is a signal; note it.",
  },
  {
    key: "outcome",
    label: "The outcome",
    rowLabel: "The outcome you want",
    anchor:
      "If this were fully fixed, what would your week look like, and what does \"working\" look like ninety days from now?",
    alternates: [
      "If you had a magic wand, what would change first?",
      "What would you be doing instead of the manual work?",
      "Ninety days from now, what tells you this is working?",
    ],
    listenFor:
      "Their ideal outcome, what they would do with the time, and any measurable marker of success. Vague means they don't yet know what they want; ask what they'd notice first.",
  },
] as const;

/** Stage indices. Stages 0–4 are the five questions. */
export const DISCOVERY_STAGE = {
  RECAP: 5,
  SUBMITTED: 6,
} as const;

/** Never more than this many drill-downs per question. Enforced server-side. */
export const MAX_FOLLOW_UPS_PER_STAGE = 2;

export interface DiscoveryAnswer {
  /**
   * One or two complete sentences, on a single line, with no label prefix.
   *
   * When a model writes it, it addresses the owner as "you". Every consumer
   * (recap rows, report card, report email, admin view) renders it standalone
   * under a heading, so a clause fragment reads as broken and a third-person
   * summary reads as a case file about the visitor rather than a reply to them.
   *
   * When the model is unavailable, `advanceWithoutModel` stores the visitor's
   * own words unedited, so that one is first person by design and must stay
   * that way: the degraded report email promises "exactly as you gave them".
   * Normalisation therefore never rewrites person — see `normalizeSummary`.
   */
  summary: string;
  /** Short verbatim phrases the visitor used. */
  quotes: string[];
  /** Any figures they gave, e.g. { amount: 4000, unit: "usd_per_month" }. */
  numbers?: Record<string, unknown>;
}

export type DiscoveryAnswers = Partial<
  Record<DiscoveryQuestionKey, DiscoveryAnswer>
>;

export function questionForStage(stage: number): DiscoveryQuestion | null {
  return DISCOVERY_QUESTIONS[stage] ?? null;
}

/** Opens the recap. The rows carry the content; this only frames them. */
export const RECAP_INTRO =
  "So if I've got this right — here's what I heard, in your words:";

/** Closes the recap, above the confirm and correct buttons. */
export const RECAP_CONFIRM = "Did I get that right?";

/**
 * The recap, played back in order in the visitor's words — rows, not prose.
 *
 * Rows deliberately. The prose version spliced each summary into a sentence
 * template that assumed lowercase clause fragments, while the extractor
 * produced whole sentences; the two disagreed and the recap rendered as
 * "…coding work. is costing you roughly At least 40 of their 60+ hours…".
 * A row never splices, so `text` is the stored summary verbatim and the only
 * transform a summary ever gets is `normalizeSummary` at extraction time.
 *
 * "Not captured" matches convex/discoveryAssessments.ts and discoveryProcessor.ts,
 * so a missing answer reads the same wherever it surfaces.
 */
export function recapRows(
  answers: DiscoveryAnswers
): { key: DiscoveryQuestionKey; label: string; text: string }[] {
  return DISCOVERY_QUESTIONS.map((q) => ({
    key: q.key,
    label: q.rowLabel,
    text: answers[q.key]?.summary?.trim() || "Not captured",
  }));
}
