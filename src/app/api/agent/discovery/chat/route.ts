import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { api } from "../../../../../../convex/_generated/api";
import { getConvexClient } from "@/lib/convex-client";
import {
  advanceWithoutModel,
  applyCorrection,
  buildCorrectionSystemPrompt,
  buildDiscoverySystemPrompt,
  clampStageTransition,
  coerceDiscoveryState,
  DEGRADED_ACK,
  DEGRADED_CORRECTION_ACK,
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

const MAX_TOKENS = 700;
/** Same id as convex/lib/anthropic.ts, so both halves of this feature agree. */
const MODEL = "claude-opus-5";
/** Only the recent transcript is needed; the system prompt carries the state. */
const HISTORY_WINDOW = 16;
const AGENT_KIND = "discovery-assessment";
const MAX_MESSAGE_CHARS = 2000;

interface ChatRequest {
  sessionId: string;
  userMessage: string;
  mode?: "answer" | "correction";
}

interface StoredMessage {
  role: string;
  content: string;
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

  const convex = getConvexClient();
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
  const system =
    mode === "answer"
      ? buildDiscoverySystemPrompt(state)
      : buildCorrectionSystemPrompt(state);

  const history: Anthropic.MessageParam[] = (
    context.messages as StoredMessage[]
  )
    .slice(-HISTORY_WINDOW)
    .map((m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    }));
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userMessage },
  ];
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: "text", text: system, cache_control: { type: "ephemeral" } },
  ];

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
        degraded: boolean
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
        send("state", { state: next, advanced, forced, anchor, degraded });
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
        const fullText = final.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("");

        if (mode === "answer") {
          const parsed = parseDiscoveryTurn(fullText);
          const { next, advanced, forced } = clampStageTransition(state, parsed);
          await commit(fullText, next, advanced, forced, false);
        } else {
          const next = applyCorrection(state, parseDiscoveryCorrection(fullText));
          await commit(fullText, next, false, false, false);
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
