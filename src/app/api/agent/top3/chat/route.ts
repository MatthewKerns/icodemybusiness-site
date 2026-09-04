import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { api } from "../../../../../../convex/_generated/api";
import { getAuthedConvexClient } from "@/lib/convex-client";
import {
  TOP3_SYSTEM_PROMPT,
  extractTop3Issues,
  stripIssuesFence,
} from "@/lib/agent/top3-prompt";
import { visitorSafeAgentError } from "@/lib/agent/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TOKENS = 1024;
const MODEL = "claude-opus-4-7";

interface ChatRequest {
  sessionId: string;
  userMessage: string;
  fileRefs?: string[];
}

interface StoredMessage {
  role: string;
  content: string;
  fileRefs?: string[];
}

interface StoredFileMeta {
  storageId: string;
  name: string;
  size: number;
  mime: string;
  extractedChars: number;
}

function buildFileContextBlock(files: StoredFileMeta[]): string | null {
  if (!files.length) return null;
  const lines = files.map(
    (f) =>
      `- ${f.name} (${f.mime}, ${Math.round(f.size / 1024)}KB, ${f.extractedChars} chars extracted)`
  );
  return `The user has uploaded the following files in this session:\n${lines.join("\n")}`;
}

async function readStoredFileText(
  storageId: string,
  convexUrl: string
): Promise<string | null> {
  try {
    const url = `${convexUrl.replace(/\/$/, "")}/api/storage/${storageId}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, 50_000);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return new Response(
      JSON.stringify({ error: "NEXT_PUBLIC_CONVEX_URL not configured" }),
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

  const { sessionId, userMessage, fileRefs } = body;
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
    fileRefs: fileRefs as never,
  });

  const history: Anthropic.MessageParam[] = (context.messages as StoredMessage[]).map(
    (m) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    })
  );

  const fileBlock = buildFileContextBlock(
    context.session.fileMeta as StoredFileMeta[]
  );
  const newFiles =
    fileRefs && fileRefs.length
      ? (context.session.fileMeta as StoredFileMeta[]).filter((f) =>
          fileRefs.includes(f.storageId)
        )
      : [];
  let inlinedFileText = "";
  for (const f of newFiles) {
    const text = await readStoredFileText(f.storageId, convexUrl);
    if (text) {
      inlinedFileText += `\n\n---\nFile: ${f.name}\n\n${text}`;
    }
  }

  const userContent = inlinedFileText
    ? `${userMessage}\n\n[Attached file contents follow]${inlinedFileText}`
    : userMessage;

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: userContent },
  ];

  const systemBlocks: Anthropic.TextBlockParam[] = [
    {
      type: "text",
      text: TOP3_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ];
  if (fileBlock) {
    systemBlocks.push({ type: "text", text: fileBlock });
  }

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

        const issues = extractTop3Issues(fullText);
        const visibleText = stripIssuesFence(fullText);

        await convex.mutation(api.agentSessions.appendMessage, {
          sessionId,
          role: "assistant",
          content: fullText,
        });

        if (issues && issues.length > 0) {
          await convex.mutation(api.agentSessions.updateTop3, {
            sessionId,
            top3Issues: issues,
          });
          send("issues", { issues });
        }

        send("done", { visibleText });
        controller.close();
      } catch (err) {
        send("error", { message: visitorSafeAgentError(err, "top3-chat") });
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
