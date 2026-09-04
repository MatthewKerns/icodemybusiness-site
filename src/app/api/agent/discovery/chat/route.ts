import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { api } from "../../../../../../convex/_generated/api";
import { getAuthedConvexClient } from "@/lib/convex-client";
import {
  advanceWithoutModel,
  applyCorrection,
  buildCorrectionSystemPrompt,
  buildDiscoveryTurnPrompt,
  clampStageTransition,
  coerceDiscoveryState,
  DEGRADED_ACK,
  DEGRADED_CORRECTION_ACK,
  DISCOVERY_SYSTEM_STABLE,
  parseDiscoveryCorrection,
  parseDiscoveryTurn,
  recordCorrectionWithoutModel,
  stripDiscoveryFence,
  type DiscoveryState,
} from "@/lib/agent/discovery-prompt";
import {
  DISCOVERY_STAGE,
  questionForStage,
} from "@/content/discovery-questions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The reply budget covers the drill-down question AND the discovery-state JSON
 * that carries the extracted answer. At 700 a rich answer produced a long
 * extraction that ran out of room mid-JSON, `parseDiscoveryTurn` returned null,
 * and the turn fell through to the degraded path — so the most detailed answers
 * were the most likely to lose their structure, silently. Truncation is now
 * reported (see `truncated` below) rather than guessed at.
 */
const MAX_TOKENS = 2000;
/** Same id as convex/lib/anthropic.ts, so both halves of this feature agree. */
const MODEL = "claude-opus-5";
/**
 * How much of the transcript the model sees. The system prompt carries the
 * extracted state, so this is for the visitor's own phrasing — which is the
 * part worth keeping now that the first question asks for a frustration and
 * gets a long, unstructured answer.
 */
const HISTORY_WINDOW = 24;
const AGENT_KIND = "discovery-assessment";
/**
 * What one answer may contain. 2000 characters is roughly 300 words, and the
 * stage-0 anchor is deliberately written to make people pour out detail — so
 * the cap was rejecting exactly the answers this assessment exists to collect.
 * Wide enough that an honest visitor never meets it; still bounded.
 */
const MAX_MESSAGE_CHARS = 8000;

interface ChatRequest {
  sessionId: string;
  userMessage: string;
  mode?: "answer" | "correction";
}

interface StoredMessage {
  role: string;
  content: string;
}

/** What one model turn cost, so cache behaviour is measurable rather than assumed. */
interface TurnUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * One turn of the discovery assessment.
 *
 * The client sends the visitor's reply to the current question. The model
 * either drills down once or extracts an answer; `clampStageTransition` then
 * decides the real next state, which is persisted and streamed back. The model
 * never picks a stage. In "correction" mode (recap said "not quite") the model
 * revises the five answers instead.
 *
 * If the model is unavailable for any reason (no key, no credits, outage) the
 * turn degrades rather than failing: the visitor's words become the answer
 * verbatim and the assessment moves on. The homepage's only call to action
 * must not depend on one vendor's billing status.
 */
export async function POST(req: NextRequest) {
  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const { sessionId } = body;
  const mode = body.mode === "correction" ? "correction" : "answer";
  const userMessage =
    typeof body.userMessage === "string" ? body.userMessage.trim() : "";
  if (!sessionId || !userMessage) {
    return json(400, { error: "Missing sessionId or userMessage" });
  }
  if (userMessage.length > MAX_MESSAGE_CHARS) {
    return json(400, {
      error: `Keep each answer under ${MAX_MESSAGE_CHARS} characters`,
    });
  }

  const convex = await getAuthedConvexClient();
  const context = await convex.query(api.agentSessions.getForServer, {
    sessionId,
  });
  if (!context || context.session.agentKind !== AGENT_KIND) {
    return json(404, { error: "Session not found" });
  }

  const state: DiscoveryState = coerceDiscoveryState(
    context.session.discoveryState
  );

  if (mode === "answer" && !questionForStage(state.stage)) {
    return json(409, { error: "This assessment has no open question" });
  }
  if (mode === "correction" && state.stage !== DISCOVERY_STAGE.RECAP) {
    return json(409, { error: "Corrections are only possible at the recap" });
  }

  await convex.mutation(api.agentSessions.appendMessage, {
    sessionId,
    role: "user",
    content: userMessage,
  });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const history: Anthropic.MessageParam[] = (
    context.messages as StoredMessage[]
  )
    .slice(-HISTORY_WINDOW)
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));

  // Cache breakpoint on the LAST message of the replayed history, not on the
  // new one. Caching is a prefix match, so everything after the breakpoint is
  // billed in full, and the new message is the only part that differs between
  // one turn and the next. By stage four the history is 20+ messages, which is
  // where nearly all of the input cost sits.
  const previous = history[history.length - 1];
  if (previous && typeof previous.content === "string") {
    history[history.length - 1] = {
      role: previous.role,
      content: [
        {
          type: "text",
          text: previous.content,
          cache_control: { type: "ephemeral" },
        },
      ],
    };
  }

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  // Stable half first with a breakpoint after it, per-stage half after. The
  // correction prompt embeds the current answers, so it changes on every
  // correction and is not worth a cache write.
  const systemBlocks: Anthropic.TextBlockParam[] =
    mode === "answer"
      ? [
          {
            type: "text",
            text: DISCOVERY_SYSTEM_STABLE,
            cache_control: { type: "ephemeral" },
          },
          { type: "text", text: buildDiscoveryTurnPrompt(state) },
        ]
      : [{ type: "text", text: buildCorrectionSystemPrompt(state) }];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      /** Persist an assistant turn + the clamped state, then tell the client. */
      const commit = async (
        assistantText: string,
        next: DiscoveryState,
        advanced: boolean,
        forced: boolean,
        degraded: boolean,
        /**
         * The model ran out of reply budget, so the extraction JSON may be cut
         * short. Reported on the `state` event rather than folded into
         * `discovery_stage_advanced`, because a truncated extraction is exactly
         * the case where the stage does NOT advance — a property on that event
         * would miss every occurrence it exists to catch.
         */
        truncated = false,
        /**
         * Token accounting for this turn. Reported because the documented
         * failure mode of prompt caching is that it silently does nothing —
         * "the bill looks lower" is not evidence. If `cacheRead` stays 0 across
         * turns in one session, a silent invalidator is at work.
         */
        usage: TurnUsage | null = null
      ) => {
        await convex.mutation(api.agentSessions.appendMessage, {
          sessionId,
          role: "assistant",
          content: assistantText,
        });
        let anchor: string | null = null;
        if (advanced) {
          const q = questionForStage(next.stage);
          if (q) {
            anchor = q.anchor;
            // The next question is part of the transcript, so hydration after
            // a redirect replays it and the model sees it in history.
            await convex.mutation(api.agentSessions.appendMessage, {
              sessionId,
              role: "assistant",
              content: q.anchor,
            });
          }
        }
        await convex.mutation(api.agentSessions.updateDiscoveryState, {
          sessionId,
          discoveryState: next,
        });
        send("state", {
          state: next,
          advanced,
          forced,
          anchor,
          degraded,
          truncated,
          usage,
        });
        send("done", { visibleText: stripDiscoveryFence(assistantText) });
      };

      /** The deterministic path: no model, the assessment still moves. */
      const degrade = async (reason: unknown) => {
        console.error("[agent:discovery-chat] degraded turn:", reason);
        if (mode === "answer") {
          const { next, advanced } = advanceWithoutModel(state, userMessage);
          send("delta", { text: DEGRADED_ACK });
          await commit(DEGRADED_ACK, next, advanced, false, true);
        } else {
          const next = recordCorrectionWithoutModel(state, userMessage);
          send("delta", { text: DEGRADED_CORRECTION_ACK });
          await commit(DEGRADED_CORRECTION_ACK, next, false, false, true);
        }
      };

      try {
        if (!apiKey) {
          await degrade("ANTHROPIC_API_KEY not configured");
          controller.close();
          return;
        }

        const client = new Anthropic({ apiKey });
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemBlocks,
          messages,
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            send("delta", { text: event.delta.text });
          }
        }

        const final = await response.finalMessage();
        // "max_tokens" means the reply was cut off, so the discovery-state JSON
        // at the end of it is the first casualty. Raising MAX_TOKENS should make
        // this rare; reporting it is how we find out whether it actually did,
        // instead of discovering months later that the richest answers were the
        // ones we failed to extract.
        const truncated = final.stop_reason === "max_tokens";
        const usage: TurnUsage = {
          input: final.usage.input_tokens,
          output: final.usage.output_tokens,
          cacheRead: final.usage.cache_read_input_tokens ?? 0,
          cacheWrite: final.usage.cache_creation_input_tokens ?? 0,
        };
        const fullText = final.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("");

        if (mode === "answer") {
          const parsed = parseDiscoveryTurn(fullText);
          const { next, advanced, forced } = clampStageTransition(state, parsed);
          await commit(fullText, next, advanced, forced, false, truncated, usage);
        } else {
          const next = applyCorrection(state, parseDiscoveryCorrection(fullText));
          await commit(fullText, next, false, false, false, truncated, usage);
        }
        controller.close();
      } catch (err) {
        try {
          // Anything the model or network throws mid-stream: finish the turn
          // without it. The client replaces any partial text with the ack.
          send("reset", {});
          await degrade(err);
        } catch (inner) {
          console.error("[agent:discovery-chat] degrade failed:", inner);
          send("error", {
            message:
              "Something went wrong saving that answer. Please send it again.",
          });
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
