import { describe, it, expect } from "vitest";
import {
  advanceWithoutModel,
  applyCorrection,
  buildCorrectionSystemPrompt,
  buildDiscoverySystemPrompt,
  buildDiscoveryTurnPrompt,
  DISCOVERY_SYSTEM_STABLE,
  clampStageTransition,
  coerceDiscoveryState,
  initialDiscoveryState,
  parseDiscoveryCorrection,
  parseDiscoveryTurn,
  recordCorrectionWithoutModel,
  stripDiscoveryFence,
  type DiscoveryState,
} from "../discovery-prompt";
import {
  DISCOVERY_QUESTIONS,
  DISCOVERY_STAGE,
  MAX_FOLLOW_UPS_PER_STAGE,
  recapRows,
} from "@/content/discovery-questions";

const fence = (json: string) =>
  `Got it.\n\n\`\`\`discovery-state\n${json}\n\`\`\``;

const complete = (summary = "Invoicing eats a day a week") =>
  parseDiscoveryTurn(
    fence(
      JSON.stringify({
        stageComplete: true,
        answer: { summary, quotes: ["a day a week"] },
      })
    )
  );

const incomplete = () =>
  parseDiscoveryTurn(
    fence(JSON.stringify({ stageComplete: false, answer: null }))
  );

describe("parseDiscoveryTurn", () => {
  it("parses a complete turn with an answer", () => {
    const parsed = complete();
    expect(parsed).toEqual({
      stageComplete: true,
      answer: { summary: "Invoicing eats a day a week", quotes: ["a day a week"] },
    });
  });

  it("returns null when there is no fence", () => {
    expect(parseDiscoveryTurn("Just prose, no block.")).toBeNull();
  });

  it("returns null on malformed JSON", () => {
    expect(parseDiscoveryTurn(fence("{not json"))).toBeNull();
  });

  it("drops an answer with an empty summary", () => {
    const parsed = parseDiscoveryTurn(
      fence(JSON.stringify({ stageComplete: true, answer: { summary: "  " } }))
    );
    expect(parsed).toEqual({ stageComplete: true, answer: null });
  });

  it("keeps numbers only when they are an object", () => {
    const parsed = parseDiscoveryTurn(
      fence(
        JSON.stringify({
          stageComplete: true,
          answer: { summary: "x", quotes: [], numbers: { amount: 4000 } },
        })
      )
    );
    expect(parsed?.answer?.numbers).toEqual({ amount: 4000 });
  });
});

describe("stripDiscoveryFence", () => {
  it("removes the fence and trailing whitespace", () => {
    expect(stripDiscoveryFence(fence("{}"))).toBe("Got it.");
  });
  it("leaves text without a fence alone", () => {
    expect(stripDiscoveryFence("plain")).toBe("plain");
  });
});

describe("clampStageTransition", () => {
  it("advances exactly one stage on completion and resets follow-ups", () => {
    const current: DiscoveryState = {
      ...initialDiscoveryState(),
      stage: 1,
      followUpsUsed: 1,
    };
    const { next, advanced, forced } = clampStageTransition(current, complete());
    expect(advanced).toBe(true);
    expect(forced).toBe(false);
    expect(next.stage).toBe(2);
    expect(next.followUpsUsed).toBe(0);
    expect(next.answers.cost?.summary).toBe("Invoicing eats a day a week");
  });

  it("increments follow-ups when the model asks a drill-down", () => {
    const { next, advanced } = clampStageTransition(
      initialDiscoveryState(),
      incomplete()
    );
    expect(advanced).toBe(false);
    expect(next.stage).toBe(0);
    expect(next.followUpsUsed).toBe(1);
  });

  it("forces completion once the follow-up cap is reached", () => {
    const current: DiscoveryState = {
      ...initialDiscoveryState(),
      followUpsUsed: MAX_FOLLOW_UPS_PER_STAGE,
      answers: { problem: { summary: "partial", quotes: [] } },
    };
    const { next, advanced, forced } = clampStageTransition(current, incomplete());
    expect(advanced).toBe(true);
    expect(forced).toBe(true);
    expect(next.stage).toBe(1);
    expect(next.answers.problem?.summary).toBe("partial");
  });

  it("records a placeholder when forced with nothing extracted", () => {
    const current: DiscoveryState = {
      ...initialDiscoveryState(),
      followUpsUsed: MAX_FOLLOW_UPS_PER_STAGE,
    };
    const { next } = clampStageTransition(current, null);
    expect(next.answers.problem?.summary).toBe("Not captured");
  });

  it("never moves past the recap regardless of the model", () => {
    const current: DiscoveryState = {
      ...initialDiscoveryState(),
      stage: DISCOVERY_STAGE.RECAP,
    };
    const { next, advanced } = clampStageTransition(current, complete());
    expect(advanced).toBe(false);
    expect(next.stage).toBe(DISCOVERY_STAGE.RECAP);
  });

  it("reaches the recap after the fifth completion", () => {
    let state = initialDiscoveryState();
    for (let i = 0; i < 5; i++) {
      state = clampStageTransition(state, complete(`answer ${i}`)).next;
    }
    expect(state.stage).toBe(DISCOVERY_STAGE.RECAP);
    expect(Object.keys(state.answers)).toEqual([
      "problem",
      "cost",
      "history",
      "stakes",
      "outcome",
    ]);
  });
});

describe("advanceWithoutModel", () => {
  it("records the visitor's words verbatim and advances", () => {
    const { next, advanced } = advanceWithoutModel(
      initialDiscoveryState(),
      "  Chasing invoices  "
    );
    expect(advanced).toBe(true);
    expect(next.stage).toBe(1);
    expect(next.answers.problem).toEqual({
      summary: "Chasing invoices",
      quotes: ["Chasing invoices"],
    });
  });

  it("does nothing outside a question stage", () => {
    const current = { ...initialDiscoveryState(), stage: DISCOVERY_STAGE.RECAP };
    expect(advanceWithoutModel(current, "x").advanced).toBe(false);
  });
});

describe("corrections", () => {
  const atRecap = (): DiscoveryState => ({
    ...initialDiscoveryState(),
    stage: DISCOVERY_STAGE.RECAP,
    answers: {
      problem: { summary: "p", quotes: [] },
      cost: { summary: "one day", quotes: [] },
    },
  });

  it("applies a model correction to only the answers it returns", () => {
    const parsed = parseDiscoveryCorrection(
      fence(
        JSON.stringify({
          answers: { cost: { summary: "two days a week", quotes: [] } },
        })
      )
    );
    const next = applyCorrection(atRecap(), parsed);
    expect(next.answers.cost?.summary).toBe("two days a week");
    expect(next.answers.problem?.summary).toBe("p");
  });

  it("keeps figures the correction turn forgot to repeat", () => {
    // The model re-emits all five answers and routinely drops "numbers" from
    // the ones it did not change. Losing the figure loses the whole cost leg.
    const before: DiscoveryState = {
      ...atRecap(),
      answers: {
        ...atRecap().answers,
        cost: {
          summary: "one day",
          quotes: ["a day"],
          numbers: { amount: 4000, unit: "usd_per_month" },
        },
      },
    };
    const parsed = parseDiscoveryCorrection(
      fence(
        JSON.stringify({
          answers: { cost: { summary: "two days a week", quotes: [] } },
        })
      )
    );
    const next = applyCorrection(before, parsed);
    expect(next.answers.cost?.summary).toBe("two days a week");
    expect(next.answers.cost?.numbers).toEqual({
      amount: 4000,
      unit: "usd_per_month",
    });
    expect(next.answers.cost?.quotes).toEqual(["a day"]);
  });

  it("keeps a verbatim note when the model is unavailable", () => {
    const next = recordCorrectionWithoutModel(atRecap(), "It's two days");
    expect(next.correction).toBe("It's two days");
    expect(recordCorrectionWithoutModel(next, "and rising").correction).toBe(
      "It's two days\nand rising"
    );
  });

  it("recap confirmation survives a round trip through coercion", () => {
    const stored = { ...atRecap(), recapConfirmed: true, correction: "note" };
    const coerced = coerceDiscoveryState(JSON.parse(JSON.stringify(stored)));
    expect(coerced.recapConfirmed).toBe(true);
    expect(coerced.correction).toBe("note");
    expect(coerced.stage).toBe(DISCOVERY_STAGE.RECAP);
  });
});

describe("coerceDiscoveryState", () => {
  it("returns the initial state for garbage", () => {
    expect(coerceDiscoveryState(null)).toEqual(initialDiscoveryState());
    expect(coerceDiscoveryState("nope")).toEqual(initialDiscoveryState());
  });
  it("clamps an out-of-range stage", () => {
    expect(coerceDiscoveryState({ stage: 99 }).stage).toBe(
      DISCOVERY_STAGE.SUBMITTED
    );
    expect(coerceDiscoveryState({ stage: -4 }).stage).toBe(0);
  });
});

describe("prompts", () => {
  it("tells the model to stop asking once follow-ups are exhausted", () => {
    const prompt = buildDiscoverySystemPrompt({
      ...initialDiscoveryState(),
      followUpsUsed: MAX_FOLLOW_UPS_PER_STAGE,
    });
    expect(prompt).toMatch(/Do NOT ask another question/);
    expect(prompt).toMatch(/What's your biggest frustration in the business/);
  });

  it("carries the hard rules into both prompts", () => {
    const a = buildDiscoverySystemPrompt(initialDiscoveryState());
    const b = buildCorrectionSystemPrompt({
      ...initialDiscoveryState(),
      stage: DISCOVERY_STAGE.RECAP,
    });
    for (const p of [a, b]) {
      expect(p).toMatch(/Never quote, estimate, or hint at a price/);
      expect(p).toMatch(/No reassurance copy/);
      expect(p).toMatch(/Never invent numbers/);
    }
  });

  it("throws when asked for a prompt outside a question stage", () => {
    expect(() =>
      buildDiscoverySystemPrompt({
        ...initialDiscoveryState(),
        stage: DISCOVERY_STAGE.RECAP,
      })
    ).toThrow();
  });
});

describe("cacheable prompt split", () => {
  const atStage = (stage: number): DiscoveryState => ({
    ...initialDiscoveryState(),
    stage,
    answers: {
      problem: { summary: "You lose Mondays to re-keying orders.", quotes: [] },
    },
  });

  it("keeps the stable half byte-identical across stages and follow-ups", () => {
    // This is the whole point: prompt caching is a prefix match, so a single
    // byte of per-stage content leaking into this block silently stops the
    // cache from ever being read.
    const a = DISCOVERY_SYSTEM_STABLE;
    expect(buildDiscoverySystemPrompt(atStage(0))).toContain(a);
    expect(buildDiscoverySystemPrompt(atStage(3))).toContain(a);
    expect(
      buildDiscoverySystemPrompt({
        ...atStage(3),
        followUpsUsed: MAX_FOLLOW_UPS_PER_STAGE,
      })
    ).toContain(a);
  });

  it("keeps every varying part out of the stable half", () => {
    for (const q of DISCOVERY_QUESTIONS) {
      expect(DISCOVERY_SYSTEM_STABLE).not.toContain(q.anchor);
    }
    expect(DISCOVERY_SYSTEM_STABLE).not.toContain("You lose Mondays");
    expect(DISCOVERY_SYSTEM_STABLE).not.toContain("What to do on this turn");
  });

  it("carries the question and the prior answers in the per-turn half", () => {
    const turn = buildDiscoveryTurnPrompt(atStage(1));
    expect(turn).toContain(DISCOVERY_QUESTIONS[1].anchor);
    expect(turn).toContain("You lose Mondays to re-keying orders.");
    expect(turn).toContain("What to do on this turn");
  });

  it("still composes into the same whole prompt", () => {
    const state = atStage(2);
    expect(buildDiscoverySystemPrompt(state)).toBe(
      `${DISCOVERY_SYSTEM_STABLE}\n\n${buildDiscoveryTurnPrompt(state)}`
    );
  });
});

describe("recapRows", () => {
  const answers = {
    problem: { summary: "You chase invoices by hand every week.", quotes: [] },
    cost: { summary: "It costs you about a day a week.", quotes: [] },
    history: { summary: "It started two years ago.", quotes: [] },
    stakes: { summary: "You cannot take on more clients.", quotes: [] },
    outcome: { summary: "Invoices go out by themselves.", quotes: [] },
  };

  it("plays the answers back in order, one row per question", () => {
    const rows = recapRows(answers);
    expect(rows.map((r) => r.key)).toEqual(
      DISCOVERY_QUESTIONS.map((q) => q.key)
    );
    expect(rows.map((r) => r.label)).toEqual(
      DISCOVERY_QUESTIONS.map((q) => q.rowLabel)
    );
  });

  it("never rewrites a summary — the row text is what was stored", () => {
    // The whole point of rows over prose: the old template spliced summaries
    // into a sentence and produced "...coding work. is costing you roughly".
    for (const row of recapRows(answers)) {
      expect(row.text).toBe(
        answers[row.key as keyof typeof answers].summary
      );
    }
  });

  it("does not duplicate a phrase the summary already contains", () => {
    const rows = recapRows({
      ...answers,
      stakes: {
        summary: "If nothing changes, you stay stuck at the same rate.",
        quotes: [],
      },
    });
    const stakes = rows.find((r) => r.key === "stakes")!;
    expect(stakes.text).toBe(
      "If nothing changes, you stay stuck at the same rate."
    );
    expect(stakes.text.match(/If nothing changes/g)).toHaveLength(1);
  });

  it("says so plainly when an answer is missing", () => {
    const rows = recapRows({ problem: answers.problem });
    expect(rows[0].text).toBe(answers.problem.summary);
    expect(rows[1].text).toBe("Not captured");
  });
});

describe("summary normalisation", () => {
  const summaryOf = (raw: string) =>
    parseDiscoveryTurn(
      fence(
        JSON.stringify({
          stageComplete: true,
          answer: { summary: raw, quotes: [] },
        })
      )
    )?.answer?.summary;

  it("folds newlines away so one answer stays one line", () => {
    // priorAnswersBlock emits "- <label>: <summary>" per answer; a newline in
    // a degraded summary corrupts that list for every later stage.
    expect(summaryOf("Two days a week.\nEvery week.")).toBe(
      "Two days a week. Every week."
    );
  });

  it("strips a leaked heading", () => {
    expect(summaryOf("The outcome you want: invoices send themselves")).toBe(
      "invoices send themselves"
    );
  });

  it("leaves a legitimate colon alone", () => {
    expect(summaryOf("Mondays: the worst day of the week")).toBe(
      "Mondays: the worst day of the week"
    );
  });

  it("never rewrites person", () => {
    // Person is the model's job. A regex here cannot tell "we" meaning the
    // owner from "we" meaning the team, and the degraded path deliberately
    // stores the visitor's own first-person words.
    const first = "I spend 40 hours a week coding and we cannot keep up.";
    expect(summaryOf(first)).toBe(first);
    expect(advanceWithoutModel(initialDiscoveryState(), first).next.answers
      .problem?.summary).toBe(first);
  });

  it("is idempotent across rehydration", () => {
    const once = coerceDiscoveryState({
      ...initialDiscoveryState(),
      answers: { problem: { summary: "The problem:  spaced\n out", quotes: [] } },
    });
    const twice = coerceDiscoveryState(JSON.parse(JSON.stringify(once)));
    expect(once.answers.problem?.summary).toBe("spaced out");
    expect(twice.answers.problem?.summary).toBe(once.answers.problem?.summary);
  });
});
