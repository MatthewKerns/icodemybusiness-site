/**
 * Funnel constraint analysis — pure, so it is unit-testable without Convex.
 *
 * Theory-of-constraints applied to the visitor funnel: at any moment exactly one
 * step limits bookings, and the operator's time goes there. The rules are
 * deliberately conservative — a "constraint" is only named when the data can
 * bear it, and every verdict carries the numbers that produced it so the owner
 * can disagree with the reasoning, not just the answer.
 *
 * The same rule runs in PostHog (dashboard 933266, "Key constraint" tile) over
 * the authoritative event stream. This copy runs over the Convex mirror so the
 * site's own funnel map can show it. Keep the floors identical.
 */

export const MIN_ARRIVALS = 50; // below this, nothing downstream can be judged
export const MIN_STEP_N = 20; // a transition needs this many entrants to be a candidate

export type StepKey =
  | "arrived"
  | "splash_entered"
  | "assessment_started"
  | "answering"
  | "recap"
  | "email"
  | "book_click"
  | "booked";

export interface StepCount {
  key: StepKey;
  label: string;
  /** Unique sessions that reached this step (page views for `arrived`). */
  n: number;
  /** False when the step exists in the taxonomy but is not written to Convex. */
  measured: boolean;
  /** Earliest timestamp this event has EVER been recorded, if any. */
  firstSeenAt?: number;
  /** Where the number comes from, for the evidence table. */
  source: string;
}

export interface FunnelInput {
  windowDays: number;
  since: number;
  until: number;
  steps: StepCount[];
}

export type ConstraintKind = "traffic" | "step" | "unmeasured" | "insufficient";

export interface Transition {
  from: StepKey;
  to: StepKey;
  entered: number;
  advanced: number;
  /** 0–1, or null when nothing entered. */
  rate: number | null;
  lost: number;
  /** Excluded from constraint selection, with the reason. */
  excluded?: string;
}

export interface FunnelReport {
  window: { days: number; since: number; until: number };
  steps: StepCount[];
  transitions: Transition[];
  constraint: {
    kind: ConstraintKind;
    stepKey?: StepKey;
    title: string;
    why: string[];
    nextAction: string;
  };
  gaps: string[];
}

function pct(rate: number | null): string {
  return rate === null ? "n/a" : `${Math.round(rate * 100)}%`;
}

function instrumentedMidWindow(step: StepCount, since: number): boolean {
  return step.firstSeenAt !== undefined && step.firstSeenAt > since;
}

export function analyzeFunnel(input: FunnelInput): FunnelReport {
  const { steps, since, until, windowDays } = input;
  const gaps: string[] = [];

  for (const s of steps) {
    if (!s.measured) {
      gaps.push(
        `"${s.label}" is not written to Convex (${s.source}); it cannot appear here until it is.`,
      );
    } else if (instrumentedMidWindow(s, since)) {
      gaps.push(
        `"${s.label}" was first recorded on ${new Date(s.firstSeenAt!).toISOString().slice(0, 10)}, inside this window — its count covers only part of it.`,
      );
    }
  }

  const transitions: Transition[] = [];
  for (let i = 1; i < steps.length; i++) {
    const from = steps[i - 1];
    const to = steps[i];
    const t: Transition = {
      from: from.key,
      to: to.key,
      entered: from.n,
      advanced: to.n,
      rate: from.n > 0 ? Math.min(1, to.n / from.n) : null,
      lost: Math.max(0, from.n - to.n),
    };
    if (!from.measured) t.excluded = "the entering step is unmeasured";
    else if (!to.measured) t.excluded = "the next step is unmeasured";
    else if (instrumentedMidWindow(from, since) || instrumentedMidWindow(to, since))
      t.excluded = "one side was instrumented inside the window";
    else if (from.key === "arrived")
      t.excluded = "page views are not people; the first per-person step is the splash";
    else if (from.n < MIN_STEP_N) t.excluded = `fewer than ${MIN_STEP_N} entered`;
    transitions.push(t);
  }

  const arrivals = steps[0]?.n ?? 0;
  const base = { window: { days: windowDays, since, until }, steps, transitions, gaps };

  if (arrivals < MIN_ARRIVALS) {
    return {
      ...base,
      constraint: {
        kind: "traffic",
        stepKey: "arrived",
        title: "Not enough visitors to judge anything below the front door",
        why: [
          `${arrivals} page views in the last ${windowDays} days; ${MIN_ARRIVALS} is the floor for reading any step's conversion.`,
          `At this volume every downstream number is one or two people, so a "drop-off" is noise, not behaviour.`,
          "Nothing in the funnel can be learned from or improved until real visitors reach it. The constraint is upstream of the site.",
        ],
        nextAction:
          "Get traffic to this deployment: if the apex domain is not pointed here, the cutover is the constraint; if it is, the constraint is distribution (warm network, content).",
      },
    };
  }

  const candidates = transitions.filter((t) => !t.excluded);
  if (candidates.length === 0) {
    return {
      ...base,
      constraint: {
        kind: "insufficient",
        title: "Enough arrivals, but no step has enough entrants to name a constraint",
        why: [
          `${arrivals} page views, but no per-person step reached ${MIN_STEP_N} entrants with both sides measured.`,
          ...transitions.filter((t) => t.excluded).map((t) => `${t.from} → ${t.to}: ${t.excluded}.`),
        ],
        nextAction: "Fix the measurement gaps listed, then wait for entrants.",
      },
    };
  }

  const worst = candidates.reduce((a, b) => (b.lost > a.lost ? b : a));
  const worstTo = steps.find((s) => s.key === worst.to)!;
  const worstFrom = steps.find((s) => s.key === worst.from)!;
  const next = steps[steps.findIndex((s) => s.key === worst.to) + 1];
  const others = candidates
    .filter((t) => t !== worst)
    .map((t) => `${t.from} → ${t.to} loses ${t.lost} (${pct(t.rate)} advance)`);

  if (next && !next.measured && worst.lost === 0) {
    return {
      ...base,
      constraint: {
        kind: "unmeasured",
        stepKey: next.key,
        title: `The next step, "${next.label}", is invisible`,
        why: [
          `Every measured transition holds; the first place people can vanish unseen is "${next.label}", which is not recorded here.`,
        ],
        nextAction: `Record "${next.label}" server-side (${next.source}) before optimising anything else.`,
      },
    };
  }

  return {
    ...base,
    constraint: {
      kind: "step",
      stepKey: worst.to,
      title: `Biggest loss: "${worstFrom.label}" → "${worstTo.label}"`,
      why: [
        `${worst.entered} reached "${worstFrom.label}"; ${worst.advanced} went on to "${worstTo.label}" (${pct(worst.rate)}). ${worst.lost} people were lost here — more than at any other measured step.`,
        ...(others.length ? [`For comparison: ${others.join("; ")}.`] : []),
        `Window: last ${windowDays} days, ${arrivals} page views. Candidates need ≥${MIN_STEP_N} entrants and both sides measured.`,
      ],
      nextAction: `Work on what happens between "${worstFrom.label}" and "${worstTo.label}"; re-check after the next ${MIN_STEP_N} entrants.`,
    },
  };
}
