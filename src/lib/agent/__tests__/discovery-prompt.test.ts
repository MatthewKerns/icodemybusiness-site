import { describe, it, expect } from "vitest";
import {
  advanceWithoutModel,
  applyCorrection,
  buildCorrectionSystemPrompt,
  buildDiscoverySystemPrompt,
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
  DISCOVERY_STAGE,
  MAX_FOLLOW_UPS_PER_STAGE,
  recapText,
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
    expect(prompt).toMatch(/What's the biggest thing eating your week/);
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

describe("recapText", () => {
  it("plays the answers back in order", () => {
    const text = recapText({
      problem: { summary: "chasing invoices", quotes: [] },
      cost: { summary: "a day a week", quotes: [] },
      history: { summary: "It started two years ago", quotes: [] },
      stakes: { summary: "I can't take on more clients", quotes: [] },
      outcome: { summary: "invoices go out by themselves", quotes: [] },
    });
    expect(text).toBe(
      "So if I've got this right: chasing invoices is costing you roughly a day a week. It started two years ago. If nothing changes, I can't take on more clients. The outcome you want is invoices go out by themselves. Did I get that right?"
    );
  });
});
