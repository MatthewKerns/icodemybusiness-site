import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { callClaudeTool, MODEL, type ClaudeTool } from "./lib/anthropic";
import { PATHS } from "../src/content/landing";

/**
 * Background finalisation for a discovery assessment: one forced tool call
 * turns the five confirmed answers into (a) the visitor-facing summary and
 * (b) Matthew's internal pre-call brief, then the report email goes out.
 *
 * Runs as an action so it survives the visitor navigating away; the client
 * watches `assessments.status` reactively. Never leaves the row stuck on
 * "processing": if the model is unreachable the summary is assembled from the
 * answers verbatim and `processingError` records why.
 */

type PathKey = (typeof PATHS)[number]["key"];
const PATH_KEYS = PATHS.map((p) => p.key) as PathKey[];
const DEFAULT_PATH: PathKey = "diagnostic";

interface Summary {
  problem: string;
  impact: string;
  history: string;
  stakes: string;
  idealOutcome: string;
  recommendedPath: string;
  thisWeekAction: string;
}

interface ReportResult {
  summary?: Partial<Summary>;
  internalBrief?: string;
}

const SYSTEM = `You are a senior operations and engineering consultant at iCodeMyBusiness (Matthew Kerns). A business owner has just completed a five-question discovery assessment on our website. You will write two things from their answers.

1. "summary" — the visitor-facing write-up. Each field is one to three plain sentences in the owner's own words where possible. It is a mirror held up to what they said, sharpened, not a pitch. "recommendedPath" is which of our four routes fits them best (keys below). "thisWeekAction" is one concrete thing they can do this week on their own, without us, that moves their problem.

2. "internalBrief" — for Matthew only, never shown to the visitor. Markdown, under 250 words: fit (is this our kind of problem), urgency signals, budget signals stated qualitatively (never a number we didn't hear), what's missing or contradictory in their answers, the two or three questions to ask on the intro call, and which path you'd propose and why.

RULES
- Never invent numbers, facts, or evidence. If the owner gave no figure, say the cost is unquantified; do not estimate one.
- Never mention, quote, or estimate a price, rate, or budget for working with us — not in the summary, not in the brief.
- No reassurance copy ("no pressure", "no obligation", "don't worry"). No hype. Plain, specific, direct.
- The summary must not sell. Clarity is the deliverable.

THE FOUR PATHS (use the key exactly):
${PATHS.map((p) => `- ${p.key}: "${p.name}" — for: ${p.forWho} What it is: ${p.what} Timeline: ${p.timeline}`).join("\n")}

When in doubt, "diagnostic" is where most people should start.`;

function reportTool(): ClaudeTool {
  return {
    name: "write_discovery_report",
    description:
      "Write the visitor-facing summary and the internal pre-call brief from a completed discovery assessment.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["summary", "internalBrief"],
      properties: {
        summary: {
          type: "object",
          additionalProperties: false,
          required: [
            "problem",
            "impact",
            "history",
            "stakes",
            "idealOutcome",
            "recommendedPath",
            "thisWeekAction",
          ],
          properties: {
            problem: { type: "string" },
            impact: { type: "string" },
            history: { type: "string" },
            stakes: { type: "string" },
            idealOutcome: { type: "string" },
            recommendedPath: { type: "string", enum: PATH_KEYS },
            thisWeekAction: { type: "string" },
          },
        },
        internalBrief: { type: "string" },
      },
    },
  };
}

function answersBlock(
  answers: { key: string; question: string; summary: string; quotes: string[]; numbers?: unknown }[]
): string {
  return answers
    .map((a) => {
      const quotes = a.quotes.length
        ? `\n  Verbatim: ${a.quotes.map((q) => `"${q}"`).join("; ")}`
        : "";
      const numbers = a.numbers ? `\n  Figures given: ${JSON.stringify(a.numbers)}` : "";
      return `Q (${a.key}): ${a.question}\n  Answer: ${a.summary}${quotes}${numbers}`;
    })
    .join("\n\n");
}

/** Used when the model is unavailable: the answers, verbatim, as the summary. */
function fallbackSummary(
  answers: { key: string; summary: string }[]
): Summary {
  const get = (key: string) =>
    answers.find((a) => a.key === key)?.summary ?? "Not captured";
  return {
    problem: get("problem"),
    impact: get("cost"),
    history: get("history"),
    stakes: get("stakes"),
    idealOutcome: get("outcome"),
    recommendedPath: DEFAULT_PATH,
    thisWeekAction:
      "Write down, for one week, every task you touch more than once. The list is the map we'd start from.",
  };
}

function coerceSummary(
  raw: Partial<Summary> | undefined,
  fallback: Summary
): { summary: Summary; repaired: boolean } {
  if (!raw) return { summary: fallback, repaired: true };
  const str = (v: unknown, fb: string) =>
    typeof v === "string" && v.trim() ? v.trim() : fb;
  const path = PATH_KEYS.includes(raw.recommendedPath as PathKey)
    ? (raw.recommendedPath as PathKey)
    : DEFAULT_PATH;
  const summary: Summary = {
    problem: str(raw.problem, fallback.problem),
    impact: str(raw.impact, fallback.impact),
    history: str(raw.history, fallback.history),
    stakes: str(raw.stakes, fallback.stakes),
    idealOutcome: str(raw.idealOutcome, fallback.idealOutcome),
    recommendedPath: path,
    thisWeekAction: str(raw.thisWeekAction, fallback.thisWeekAction),
  };
  const repaired = path !== raw.recommendedPath;
  return { summary, repaired };
}

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://icodemybusiness.com").replace(
    /\/$/,
    ""
  );
}

export function bookingUrlFor(
  sessionId: string,
  email: string,
  name?: string
): string {
  const url = new URL("/book", siteOrigin());
  url.searchParams.set("session", sessionId);
  url.searchParams.set("email", email);
  if (name) url.searchParams.set("name", name);
  return url.toString();
}

export const finalizeAssessment = internalAction({
  args: { assessmentId: v.id("assessments") },
  handler: async (ctx, args) => {
    const doc = await ctx.runQuery(
      internal.discoveryAssessments.internalGetForFinalize,
      { assessmentId: args.assessmentId }
    );
    if (!doc) return;

    const fallback = fallbackSummary(doc.answers);
    let result: ReportResult | null = null;
    try {
      result = await callClaudeTool<ReportResult>(
        SYSTEM,
        `COMPLETED ASSESSMENT\n\n${answersBlock(doc.answers)}`,
        reportTool(),
        3000,
        MODEL
      );
    } catch (error) {
      console.error("Discovery report drafting failed:", error);
    }

    const { summary, repaired } = coerceSummary(result?.summary, fallback);
    const internalBrief =
      result?.internalBrief?.trim() ||
      "[Auto-draft unavailable — write the pre-call brief from the answers above.]";

    let processingError: string | undefined;
    if (!result) {
      processingError =
        "Background drafting unavailable (check ANTHROPIC_API_KEY in the Convex deployment env). Summary is the raw answers.";
    } else if (repaired) {
      processingError = `Model chose an unknown path; defaulted to "${DEFAULT_PATH}".`;
    }

    await ctx.runMutation(internal.discoveryAssessments.internalStoreFinalResult, {
      assessmentId: args.assessmentId,
      summary,
      internalBrief,
      processingError,
    });

    const path =
      PATHS.find((p) => p.key === summary.recommendedPath) ??
      PATHS.find((p) => p.key === DEFAULT_PATH)!;

    await ctx.scheduler.runAfter(0, internal.emails.sendDiscoveryReportEmail, {
      assessmentId: args.assessmentId,
      email: doc.email,
      name: doc.name,
      summary,
      pathName: path.name,
      pathWhat: path.what,
      bookingUrl: bookingUrlFor(doc.sessionId, doc.email, doc.name),
      degraded: !result,
    });
  },
});
