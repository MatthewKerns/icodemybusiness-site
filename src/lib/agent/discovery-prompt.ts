import {
  DISCOVERY_QUESTIONS,
  DISCOVERY_STAGE,
  MAX_FOLLOW_UPS_PER_STAGE,
  questionForStage,
  type DiscoveryAnswer,
  type DiscoveryAnswers,
  type DiscoveryQuestionKey,
} from "@/content/discovery-questions";

/**
 * Prompt + stage control for the Discovery Assessment.
 *
 * The model is deliberately NOT trusted with the stage number. It reports only
 * whether the current question is answered well enough, plus its extraction;
 * `clampStageTransition` decides what actually happens. That is the one
 * mechanism here that the older agents (top3, ecommerce) do not have.
 */

export const DISCOVERY_FENCE_OPEN = "```discovery-state";
export const DISCOVERY_FENCE_CLOSE = "```";

/** Persisted on agentSessions.discoveryState. */
export interface DiscoveryState {
  stage: number; // 0-4 questions, 5 recap, 6 submitted
  followUpsUsed: number; // for the current stage; reset on advance
  answers: DiscoveryAnswers;
  recapConfirmed: boolean;
  /**
   * What the visitor said was wrong at the recap, kept verbatim when the model
   * was unavailable to fold it into the answers. Travels into the report.
   */
  correction?: string;
}

export function initialDiscoveryState(): DiscoveryState {
  return { stage: 0, followUpsUsed: 0, answers: {}, recapConfirmed: false };
}

/** What the model emits at the end of a normal (answer) turn. */
export interface ParsedTurn {
  stageComplete: boolean;
  answer: DiscoveryAnswer | null;
}

/** What the model emits at the end of a recap-correction turn. */
export interface ParsedCorrection {
  answers: DiscoveryAnswers;
}

const RULES = `# Rules
- Be concise: 2–4 sentences per turn, business-owner vocabulary, no frameworks by name.
- Never invent numbers, facts, or evidence. If they didn't say it, it isn't in the answer.
- Never quote, estimate, or hint at a price, rate, or budget for working with us. If asked, say that's for the call.
- No reassurance copy. Do not say things like "no pressure", "no obligation", or "don't worry". Answer plainly.
- Do not upsell. Clarity for them is the goal; it sells itself.
- Use the visitor's own words wherever you can.
- Write every recorded answer TO the owner as "you", never about them as "he", "she" or "they". The answers are played straight back to them.`;

function priorAnswersBlock(answers: DiscoveryAnswers): string {
  const lines: string[] = [];
  for (const q of DISCOVERY_QUESTIONS) {
    const a = answers[q.key];
    if (!a) continue;
    lines.push(`- ${q.label}: ${a.summary}`);
  }
  return lines.length
    ? `# What they've already told you\n${lines.join("\n")}`
    : "# What they've already told you\n(nothing yet — this is the first question)";
}

/**
 * The half of the turn prompt that is identical for every stage and every
 * visitor: who the model is, the standing rules, and the output contract.
 *
 * Split out so it can carry a cache breakpoint. Caching is a prefix match
 * rendered tools -> system -> messages, so stable content only caches if it
 * comes FIRST. The role preamble and the output format used to sit at opposite
 * ends of one string with the per-stage content between them; they are now
 * adjacent, which is the only reordering this change makes.
 */
export const DISCOVERY_SYSTEM_STABLE = `You are an experienced business operations consultant employed by iCodeMyBusiness. A business owner is working through a short, structured discovery assessment on our website. It has five fixed questions, asked in order; the website asks each one. Your job on this turn is narrow.

Do not preview the next question. Do not summarise the whole conversation. Do not offer solutions yet.

${RULES}

# Output format
End EVERY reply with a JSON code block fenced with ${DISCOVERY_FENCE_OPEN} containing your current best extraction for THIS question, even when you are asking a follow-up:

${DISCOVERY_FENCE_OPEN}
{"stageComplete": true, "answer": {"summary": "You spend about two days a week re-keying orders by hand, and it has to be you who does it.", "quotes": ["re-keying every order"], "numbers": {"amount": 4000, "unit": "usd_per_month"}}}
${DISCOVERY_FENCE_CLOSE}

"summary" is shown to the owner under a heading of its own, so: complete sentences, addressed to them as "you", one line with no newlines, and no label prefix ("Ideal week:", "The problem:"). One or two sentences, in their words.

"numbers" is optional and must only contain figures they actually gave. If you have nothing yet, use "answer": null.`;

/**
 * The per-stage half: which question is open, what they have already told us,
 * and what to do with this reply. All of this changes as the assessment moves,
 * so it must sit AFTER the cached prefix.
 */
export function buildDiscoveryTurnPrompt(state: DiscoveryState): string {
  const question = questionForStage(state.stage);
  if (!question) {
    throw new Error(`No question for stage ${state.stage}`);
  }
  const remaining = MAX_FOLLOW_UPS_PER_STAGE - state.followUpsUsed;
  const mustComplete = remaining <= 0;

  return `# The question they were just asked
"${question.anchor}"

Other ways to put it, if you need to rephrase: ${question.alternates.map((s) => `"${s}"`).join(" / ")}

What a good answer contains: ${question.listenFor}

${priorAnswersBlock(state.answers)}

# What to do on this turn
${
  mustComplete
    ? `You have used all follow-ups for this question. Do NOT ask another question. Acknowledge what they said in one short sentence, extract the best answer you can from everything they've said, and set "stageComplete": true.`
    : `Read their reply. If it genuinely answers the question, acknowledge it in one short sentence (no new question) and set "stageComplete": true. If it is vague or missing the thing this question is for, ask ONE specific drill-down and set "stageComplete": false. You may ask at most ${remaining} more follow-up${remaining === 1 ? "" : "s"} on this question, so only ask if it will materially sharpen the answer.`
}`;
}

/**
 * Both halves as one string, for callers that do not care about caching — the
 * tests, and anything that just wants "the prompt". The chat route uses the two
 * halves separately so it can put a breakpoint between them.
 */
export function buildDiscoverySystemPrompt(state: DiscoveryState): string {
  return `${DISCOVERY_SYSTEM_STABLE}\n\n${buildDiscoveryTurnPrompt(state)}`;
}

/**
 * System prompt for the recap-correction turn: the visitor said "not quite"
 * and typed what was wrong. The model returns the full revised answers map.
 */
export function buildCorrectionSystemPrompt(state: DiscoveryState): string {
  const current = DISCOVERY_QUESTIONS.map((q) => {
    const a = state.answers[q.key];
    return `- ${q.key} (${q.label}; asked "${q.anchor}"): ${a ? JSON.stringify(a) : "null"}`;
  }).join("\n");

  return `You are an experienced business operations consultant employed by iCodeMyBusiness. A business owner has just finished a five-question discovery assessment on our website. We played their answers back to them and they said the recap wasn't quite right. Their correction follows as the user message.

# The five answers as currently recorded
${current}

# What to do
Apply their correction to whichever answers it affects. Leave the others exactly as they are. Reply with ONE short sentence confirming what you changed. Do not ask a new question.

${RULES}

# Output format
End your reply with a JSON code block fenced with ${DISCOVERY_FENCE_OPEN} containing ALL FIVE answers (changed and unchanged), keyed problem, cost, history, stakes, outcome:

${DISCOVERY_FENCE_OPEN}
{"answers": {"problem": {"summary": "You spend about two days a week re-keying orders by hand, and it has to be you who does it.", "quotes": ["re-keying every order"]}, "cost": {"summary": "...", "quotes": [], "numbers": {"amount": 4000, "unit": "usd_per_month"}}, "history": {"summary": "...", "quotes": []}, "stakes": {"summary": "...", "quotes": []}, "outcome": {"summary": "...", "quotes": []}}}
${DISCOVERY_FENCE_CLOSE}

Every "summary" follows the same shape as before: complete sentences addressed to them as "you", one line, no label prefix. Repeat "numbers" unchanged for any answer that already had them — omitting it loses the figure they gave us.`;
}

// --- Parsing ------------------------------------------------------------

function fenceBody(assistantText: string): string | null {
  const start = assistantText.lastIndexOf(DISCOVERY_FENCE_OPEN);
  if (start === -1) return null;
  const body = assistantText.slice(start + DISCOVERY_FENCE_OPEN.length);
  const end = body.indexOf(DISCOVERY_FENCE_CLOSE);
  if (end === -1) return null;
  return body.slice(0, end).trim();
}

/**
 * The only transform a `summary` ever gets, and deliberately a small one.
 *
 * This runs inside `coerceDiscoveryState` on every route turn and every client
 * hydration, so it is applied to its own output over and over: every rule here
 * has to be idempotent.
 *
 * It does NOT rewrite person. "I" -> "you" is not a token swap (my/your,
 * I've/you've, myself/yourself), most owners say "we", where "you" and "you and
 * your team" are not recoverable from the text, and a wrong guess reads as if we
 * misheard them — the exact failure this whole change is fixing. Person is the
 * model's job (see RULES). The degraded path stores the visitor's own first-person
 * words on purpose and the report email promises them "exactly as you gave them",
 * so rewriting here would make that sentence a lie.
 */
function normalizeSummary(raw: string): string {
  // Newlines are the live bug: priorAnswersBlock emits one line per answer, so
  // a multi-line degraded summary corrupts the list for every later stage.
  let out = raw.trim().replace(/\s+/g, " ");
  // A leaked heading, e.g. "Ideal week: early focused hours". Anchored and
  // matched only against the labels we actually use — a general /^[\w ]+:/
  // would eat "Mondays: the worst day of the week".
  const labels = DISCOVERY_QUESTIONS.flatMap((q) => [q.label, q.rowLabel]);
  for (const label of labels) {
    const re = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[:—-]\\s*`, "i");
    if (re.test(out)) {
      out = out.replace(re, "");
      break;
    }
  }
  return out.trim();
}

function coerceAnswer(raw: unknown): DiscoveryAnswer | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const summary =
    typeof obj.summary === "string" ? normalizeSummary(obj.summary) : "";
  if (!summary) return null;
  const quotes = Array.isArray(obj.quotes)
    ? obj.quotes.filter((q): q is string => typeof q === "string").slice(0, 5)
    : [];
  const numbers =
    obj.numbers && typeof obj.numbers === "object"
      ? (obj.numbers as Record<string, unknown>)
      : undefined;
  return numbers ? { summary, quotes, numbers } : { summary, quotes };
}

export function parseDiscoveryTurn(assistantText: string): ParsedTurn | null {
  const json = fenceBody(assistantText);
  if (json === null) return null;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      stageComplete: parsed.stageComplete === true,
      answer: coerceAnswer(parsed.answer),
    };
  } catch {
    return null;
  }
}

export function parseDiscoveryCorrection(
  assistantText: string
): ParsedCorrection | null {
  const json = fenceBody(assistantText);
  if (json === null) return null;
  try {
    const parsed = JSON.parse(json) as { answers?: unknown };
    if (!parsed?.answers || typeof parsed.answers !== "object") return null;
    const raw = parsed.answers as Record<string, unknown>;
    const answers: DiscoveryAnswers = {};
    for (const q of DISCOVERY_QUESTIONS) {
      const a = coerceAnswer(raw[q.key]);
      if (a) answers[q.key] = a;
    }
    return { answers };
  } catch {
    return null;
  }
}

export function stripDiscoveryFence(assistantText: string): string {
  const start = assistantText.lastIndexOf(DISCOVERY_FENCE_OPEN);
  if (start === -1) return assistantText;
  return assistantText.slice(0, start).trimEnd();
}

// --- Stage control (server-authoritative) --------------------------------

/**
 * Decide the real next state from the current one and what the model claimed.
 *
 * - Completed → record the answer, advance one stage, reset follow-ups.
 * - Not completed → one more follow-up used. If that would exceed the cap,
 *   force completion with whatever the model extracted and advance anyway,
 *   so a stage can never loop.
 * - The model never chooses a stage; it can only move the visitor forward by
 *   exactly one, or hold.
 */
export function clampStageTransition(
  current: DiscoveryState,
  parsed: ParsedTurn | null
): { next: DiscoveryState; advanced: boolean; forced: boolean } {
  const question = questionForStage(current.stage);
  if (!question) {
    // Not in a question stage (recap/submitted): nothing to advance.
    return { next: current, advanced: false, forced: false };
  }
  const key: DiscoveryQuestionKey = question.key;
  const answer = parsed?.answer ?? null;
  const modelComplete = parsed?.stageComplete === true;
  const nextFollowUps = current.followUpsUsed + 1;
  const forced = !modelComplete && nextFollowUps > MAX_FOLLOW_UPS_PER_STAGE;

  if (modelComplete || forced) {
    // Prefer this turn's extraction, then whatever was captured on an earlier
    // follow-up, then an explicit placeholder — never silently drop a stage.
    const recorded: DiscoveryAnswer = answer ??
      current.answers[key] ?? { summary: "Not captured", quotes: [] };
    return {
      next: {
        ...current,
        stage: current.stage + 1,
        followUpsUsed: 0,
        answers: { ...current.answers, [key]: recorded },
      },
      advanced: true,
      forced,
    };
  }

  return {
    next: {
      ...current,
      followUpsUsed: nextFollowUps,
      // Keep the running extraction so a forced completion has something.
      answers: answer
        ? { ...current.answers, [key]: answer }
        : current.answers,
    },
    advanced: false,
    forced: false,
  };
}

export function isRecapStage(state: DiscoveryState): boolean {
  return state.stage === DISCOVERY_STAGE.RECAP;
}

export function applyCorrection(
  current: DiscoveryState,
  parsed: ParsedCorrection | null
): DiscoveryState {
  if (!parsed) return current;
  // Per field, not per answer. The model re-emits all five answers and routinely
  // drops "numbers" from the ones it did not change; a whole-object spread would
  // throw away the dollar or hours figure the visitor gave us, and with it the
  // "Figures given" line in the report.
  const answers: DiscoveryAnswers = { ...current.answers };
  for (const q of DISCOVERY_QUESTIONS) {
    const revised = parsed.answers[q.key];
    if (!revised) continue;
    const existing = current.answers[q.key];
    const numbers = revised.numbers ?? existing?.numbers;
    const quotes = revised.quotes.length ? revised.quotes : (existing?.quotes ?? []);
    answers[q.key] = numbers
      ? { summary: revised.summary, quotes, numbers }
      : { summary: revised.summary, quotes };
  }
  return { ...current, answers };
}

/** Normalise whatever is stored on the session into a DiscoveryState. */
export function coerceDiscoveryState(raw: unknown): DiscoveryState {
  if (!raw || typeof raw !== "object") return initialDiscoveryState();
  const obj = raw as Record<string, unknown>;
  const stage =
    typeof obj.stage === "number" && Number.isFinite(obj.stage)
      ? Math.max(0, Math.min(DISCOVERY_STAGE.SUBMITTED, Math.floor(obj.stage)))
      : 0;
  const followUpsUsed =
    typeof obj.followUpsUsed === "number" ? Math.max(0, obj.followUpsUsed) : 0;
  const answers: DiscoveryAnswers = {};
  if (obj.answers && typeof obj.answers === "object") {
    const rawAnswers = obj.answers as Record<string, unknown>;
    for (const q of DISCOVERY_QUESTIONS) {
      const a = coerceAnswer(rawAnswers[q.key]);
      if (a) answers[q.key] = a;
    }
  }
  const correction =
    typeof obj.correction === "string" && obj.correction.trim()
      ? obj.correction.trim()
      : undefined;
  return correction
    ? { stage, followUpsUsed, answers, recapConfirmed: obj.recapConfirmed === true, correction }
    : { stage, followUpsUsed, answers, recapConfirmed: obj.recapConfirmed === true };
}

/**
 * Deterministic path for when the model is unavailable: the visitor's reply is
 * the answer, verbatim, and the stage advances. The assessment still finishes.
 */
export function advanceWithoutModel(
  current: DiscoveryState,
  userMessage: string
): { next: DiscoveryState; advanced: boolean } {
  const question = questionForStage(current.stage);
  if (!question) return { next: current, advanced: false };
  const text = userMessage.trim();
  // Normalised here rather than left to the next turn's rehydration: this
  // summary can be the last one written before the visitor confirms the recap,
  // and it is snapshotted to Convex as-is. Person is untouched on purpose —
  // these are the visitor's own first-person words and the degraded report
  // email says so.
  const summary = normalizeSummary(text);
  const answer: DiscoveryAnswer = {
    summary: summary || "Not captured",
    quotes: text ? [text.slice(0, 160)] : [],
  };
  return {
    next: {
      ...current,
      stage: current.stage + 1,
      followUpsUsed: 0,
      answers: { ...current.answers, [question.key]: answer },
    },
    advanced: true,
  };
}

export function recordCorrectionWithoutModel(
  current: DiscoveryState,
  correction: string
): DiscoveryState {
  const text = correction.trim();
  if (!text) return current;
  const merged = current.correction ? `${current.correction}\n${text}` : text;
  return { ...current, correction: merged };
}

/** Shown in place of a model reply when it is unavailable. */
export const DEGRADED_ACK =
  "Noted. I've kept that exactly as you wrote it. Next question:";
export const DEGRADED_CORRECTION_ACK =
  "Noted. I've attached that to your answers exactly as you wrote it, and it will be in the write-up.";
