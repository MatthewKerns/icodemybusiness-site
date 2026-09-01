/**
 * Anthropic Messages API over plain `fetch`.
 *
 * Deliberately not the SDK: the default Convex runtime is not Node, and using
 * raw HTTP here avoids a `"use node"` directive on every action that calls
 * Claude. Requires ANTHROPIC_API_KEY in the CONVEX deployment env, which is
 * separate from the Next.js runtime env (see .env.example).
 */

/** Default for new callers. */
export const MODEL = "claude-opus-5";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  input?: unknown;
}

interface MessagesResponse {
  content?: ContentBlock[];
  stop_reason?: string;
}

async function callMessages(body: Record<string, unknown>): Promise<MessagesResponse | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY not set in Convex env — skipping model call");
    return null;
  }

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`Anthropic error ${res.status}: ${await res.text()}`);
    return null;
  }
  return (await res.json()) as MessagesResponse;
}

/** Plain text completion. Returns null on any failure — callers fall back. */
export async function callClaude(
  system: string,
  userText: string,
  maxTokens: number,
  model: string = MODEL,
): Promise<string | null> {
  const data = await callMessages({
    model,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userText }],
  });
  if (!data) return null;

  return (
    data.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text ?? "")
      .join("") ?? null
  );
}

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/**
 * Force a single tool call and return its parsed input.
 *
 * Tool use rather than "reply with JSON": the schema constrains generation, so
 * the result is structurally valid without any string-scraping of a code fence.
 */
export async function callClaudeTool<T>(
  system: string,
  userText: string,
  tool: ClaudeTool,
  maxTokens: number,
  model: string = MODEL,
): Promise<T | null> {
  const data = await callMessages({
    model,
    max_tokens: maxTokens,
    system,
    tools: [tool],
    tool_choice: { type: "tool", name: tool.name },
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: userText }],
  });
  if (!data) return null;

  const call = data.content?.find(
    (block) => block.type === "tool_use" && block.name === tool.name,
  );
  if (!call || call.input === undefined) {
    console.error(`Anthropic returned no ${tool.name} tool call (stop_reason=${data.stop_reason})`);
    return null;
  }
  return call.input as T;
}
