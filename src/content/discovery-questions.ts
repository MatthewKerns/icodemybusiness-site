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
  /** Short label for the stepper. */
  label: string;
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
    anchor: "What's the biggest thing eating your week right now?",
    alternates: [
      "Where does your week actually go?",
      "What's the one problem that keeps coming back?",
      "As the business grows, what's the bottleneck slowing you down?",
    ],
    listenFor:
      "A specific, recurring problem in their own words: the manual or repetitive work, the handoff that breaks, the thing they redo. Push past a vague answer once. If they say there are no real problems, ask what they would hand off first if they could.",
  },
  {
    key: "cost",
    label: "What it costs",
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
  /** The answer in the visitor's own words, one or two sentences. */
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

/**
 * The recap, played back in order in the visitor's words. From the framework:
 * "So if I've got this right: [problem] is costing roughly [cost]…"
 */
export function recapText(answers: DiscoveryAnswers): string {
  const a = (key: DiscoveryQuestionKey, fallback: string) =>
    answers[key]?.summary?.trim() || fallback;
  return (
    `So if I've got this right: ${a("problem", "the problem you described")} ` +
    `is costing you roughly ${a("cost", "an amount we haven't pinned down yet")}. ` +
    `${a("history", "It has been going on for a while")}. ` +
    `If nothing changes, ${a("stakes", "it keeps costing you")}. ` +
    `The outcome you want is ${a("outcome", "a week that runs without you in the middle of it")}. ` +
    `Did I get that right?`
  );
}
