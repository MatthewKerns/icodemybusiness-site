/**
 * Sequence definitions: which steps exist, in what order, how far apart.
 *
 * This lives in code and NOT in a table on purpose. Every string here is
 * visitor-facing copy, and `docs/copy-principles.md` requires that such copy
 * pass review and appear in a diff. A database table would let it change with
 * neither. The database holds per-lead STATE only.
 *
 * Shape follows the Soap Opera Sequence (docs/dotcom-secrets-notes.md,
 * Secret #7): five emails, one per day, each opening a loop into the next.
 * Email #1's job — welcome, set expectations, open the first loop — is folded
 * into the day-0 report rather than sent separately, because the report
 * already does it and copy-principles §6 says say a thing once.
 *
 * Bodies are deliberately absent. Emails d2 and d3 are Matthew's backstory and
 * epiphany; §2 forbids an agent authoring them, and there is nothing in this
 * repo to draft them from. They are sourced from docs/matthew-story-intake.md
 * once he answers it. `body: null` means "not yet authored" and the engine
 * treats it as a hard stop, not as an empty email.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WEEK_MS = 7 * DAY_MS;

export type TrackKey = "assessment" | "free-tools" | "academy" | "post-call";

/**
 * Which track wins when a lead qualifies for more than one. Closer to a signed
 * engagement ranks higher: someone who booked a call must never keep receiving
 * "here's why you should book".
 */
export const TRACK_PRIORITY: Record<TrackKey, number> = {
  "post-call": 50,
  assessment: 40,
  academy: 30,
  "free-tools": 20,
};

export interface SequenceStep {
  /** "d1".."d5" — also the dedupe key suffix. Never reuse or renumber. */
  key: string;
  /** Milliseconds after the previous step (or enrollment) that this is due. */
  delayMs: number;
  /** Soap Opera role, for anyone reading this cold. */
  role: string;
  /**
   * Subject line. `null` until Matthew's story intake is answered — the
   * subject of a backstory email is part of the backstory.
   */
  subject: string | null;
  /**
   * Which story-intake answers this step is drafted from. Empty means the step
   * needs no claim about the business. Used by the copy audit, and by the
   * readiness check that refuses to send an unauthored step.
   */
  requires: string[];
}

export interface SequenceTrack {
  key: TrackKey;
  /** Human label for the admin table. */
  label: string;
  steps: SequenceStep[];
  /** Cadence once the daily steps are exhausted. */
  weeklyDelayMs: number;
}

const SOAP_OPERA_DAILY: SequenceStep[] = [
  {
    key: "d1",
    delayMs: DAY_MS,
    role: "High drama + backstory — opens at the peak, ends at the wall",
    subject: null,
    requires: ["A1", "A2", "A3", "A4", "A5", "A8", "E1"],
  },
  {
    key: "d2",
    delayMs: DAY_MS,
    role: "Epiphany — the turning point, tied to the offer",
    subject: null,
    requires: ["B1", "B2", "B3", "B4", "B5", "B6"],
  },
  {
    key: "d3",
    delayMs: DAY_MS,
    role: "Hidden benefits — the non-obvious upside",
    subject: null,
    requires: ["C5", "C6"],
  },
  {
    key: "d4",
    delayMs: DAY_MS,
    role: "Urgency + CTA — real urgency only, or close on fit",
    subject: null,
    // C3 decides whether this email exists in its Brunson form at all.
    // "Fake urgency will backfire on you, and you'll lose all credibility."
    requires: ["C1", "C2", "C3"],
  },
];

export const TRACKS: Record<TrackKey, SequenceTrack> = {
  assessment: {
    key: "assessment",
    label: "Discovery assessment",
    steps: SOAP_OPERA_DAILY,
    weeklyDelayMs: WEEK_MS,
  },
  "free-tools": {
    key: "free-tools",
    label: "Free tools",
    steps: SOAP_OPERA_DAILY,
    weeklyDelayMs: WEEK_MS,
  },
  academy: {
    key: "academy",
    label: "Academy waitlist",
    steps: SOAP_OPERA_DAILY,
    weeklyDelayMs: WEEK_MS,
  },
  "post-call": {
    key: "post-call",
    label: "Post-call follow-up",
    steps: SOAP_OPERA_DAILY,
    weeklyDelayMs: WEEK_MS,
  },
};

export function getTrack(track: string): SequenceTrack | null {
  return (TRACKS as Record<string, SequenceTrack>)[track] ?? null;
}

/** The step at a 0-based index, or null once the daily phase is exhausted. */
export function stepAt(track: string, index: number): SequenceStep | null {
  const t = getTrack(track);
  if (!t) return null;
  return t.steps[index] ?? null;
}

/**
 * A step is sendable only once its copy exists. Until Matthew answers the
 * story intake every step returns false, so the engine can be deployed, swept
 * and tested without any possibility of mailing a placeholder to a visitor.
 */
export function isStepAuthored(step: SequenceStep): boolean {
  return step.subject !== null;
}

export function dedupeKey(
  enrollmentId: string,
  track: string,
  stepKey: string
): string {
  return `${enrollmentId}:${track}:${stepKey}`;
}
