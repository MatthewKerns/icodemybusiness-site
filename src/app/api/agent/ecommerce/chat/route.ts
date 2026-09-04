import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { api } from "../../../../../../convex/_generated/api";
import { getAuthedConvexClient } from "@/lib/convex-client";
import {
  ECOMMERCE_SYSTEM_PROMPT,
  extractIntakeProfile,
  stripIntakeFence,
} from "@/lib/agent/ecommerce-prompt";
import { visitorSafeAgentError } from "@/lib/agent/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TOKENS = 1024;
const MODEL = "claude-opus-4-7";

interface ChatRequest {
  sessionId: string;
  userMessage: string;
}

interface StoredMessage {
  role: string;
  content: string;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { sessionId, userMessage } = body;
  if (!sessionId || typeof userMessage !== "string") {
    return new Response(
      JSON.stringify({ error: "Missing sessionId or userMessage" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const convex = await getAuthedConvexClient();
  const context = await convex.query(api.agentSessions.getForServer, {
    sessionId,
  });
  if (!context) {
    return new Response(JSON.stringify({ error: "Session not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  await convex.mutation(api.agentSessions.appendMessage, {
    sessionId,
    role: "user",
    content: userMessage,
  });

  const history: Anthropic.MessageParam[] = (
    context.messages as StoredMessage[]
  ).map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userMessage },
  ];

  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: ECOMMERCE_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ];

  const client = new Anthropic({ apiKey });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      try {
        const response = client.messages.stream({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: systemBlocks,
          messages,
          thinking: { type: "adaptive" },
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

        const intake = extractIntakeProfile(fullText);
        const visibleText = stripIntakeFence(fullText);

        await convex.mutation(api.agentSessions.appendMessage, {
          sessionId,
          role: "assistant",
          content: fullText,
        });

        if (intake) {
          await convex.mutation(api.agentSessions.updateIntakeProfile, {
            sessionId,
            intakeProfile: intake.profile,
            ready: intake.ready,
          });
          send("profile", { profile: intake.profile, ready: intake.ready });
          // Start background drafting mid-conversation once context is rich.
          if (intake.ready) {
            await convex.mutation(api.agentSessions.kickoffPreDraft, {
              sessionId,
            });
          }
        }

        send("done", { visibleText });
        controller.close();
      } catch (err) {
        send("error", { message: visitorSafeAgentError(err, "ecommerce-chat") });
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
