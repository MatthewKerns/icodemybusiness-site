/**
 * The one place that knows how to talk to Mango.
 *
 * Mango is reached over MCP streamable-HTTP today. Whether it also exposes a
 * plain REST API is unknown, so every caller sees only `MangoClient.callTool`
 * and a REST implementation would be a one-line switch below — no call site
 * moves.
 *
 * Runs in the default Convex runtime: plain `fetch`, no MCP SDK, no "use node".
 *
 * Configured on the CONVEX deployment only — never a NEXT_PUBLIC_* var, so the
 * key never reaches a browser:
 *   npx convex env set MANGO_MCP_URL   https://mango.icodemybusiness.com/mcp
 *   npx convex env set MANGO_MCP_TOKEN mps_...
 */

const DEFAULT_MCP_URL = "https://mango.icodemybusiness.com/mcp";
const PROTOCOL_VERSION = "2025-06-18";
const TIMEOUT_MS = 20_000;

export class MangoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MangoError";
  }
}

export interface MangoClient {
  callTool<T = unknown>(name: string, args?: Record<string, unknown>): Promise<T>;
}

interface JsonRpcMessage {
  id?: number | string;
  result?: {
    isError?: boolean;
    structuredContent?: unknown;
    content?: Array<{ type: string; text?: string }>;
  };
  error?: { code?: number; message?: string };
}

/**
 * A streamable-HTTP MCP server may answer with either a single JSON object or an
 * SSE stream, so both are handled. For SSE we take the last `data:` frame whose
 * id matches the request.
 */
function parseJsonRpc(body: string, contentType: string, id: number): JsonRpcMessage {
  if (!contentType.includes("text/event-stream")) {
    return JSON.parse(body) as JsonRpcMessage;
  }

  let match: JsonRpcMessage | null = null;
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const parsed = JSON.parse(payload) as JsonRpcMessage;
      if (parsed.id === id || parsed.id === undefined) match = parsed;
    } catch {
      // Keep-alive comments and partial frames are expected; skip them.
    }
  }
  if (!match) throw new MangoError("No JSON-RPC response found in the event stream");
  return match;
}

class McpMangoClient implements MangoClient {
  private nextId = 1;
  private sessionId: string | null = null;
  private initialized: Promise<void> | null = null;

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      authorization: `Bearer ${this.token}`,
      "mcp-protocol-version": PROTOCOL_VERSION,
    };
    // Optional: some servers do not issue one, which is not an error.
    if (this.sessionId) headers["mcp-session-id"] = this.sessionId;
    return headers;
  }

  private async post(payload: Record<string, unknown>): Promise<Response> {
    return await fetch(this.url, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  }

  private async rpc<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const id = this.nextId++;
    const res = await this.post({ jsonrpc: "2.0", id, method, params });
    if (!res.ok) {
      throw new MangoError(
        `Mango ${method} failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`,
      );
    }

    const session = res.headers.get("mcp-session-id");
    if (session) this.sessionId = session;

    const message = parseJsonRpc(
      await res.text(),
      res.headers.get("content-type") ?? "",
      id,
    );
    if (message.error) {
      throw new MangoError(`Mango ${method} error: ${message.error.message ?? "unknown"}`);
    }
    return message.result as T;
  }

  /**
   * One handshake per action invocation, reused across that run's tool calls.
   * The session id is deliberately not persisted: Convex actions are stateless
   * and a stale id only buys a 404-and-retry.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      this.initialized = (async () => {
        await this.rpc("initialize", {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: {},
          clientInfo: { name: "icmb-objectives", version: "1" },
        });
        // A notification has no id and may come back 200 or 202 with no body.
        const res = await this.post({
          jsonrpc: "2.0",
          method: "notifications/initialized",
        });
        if (!res.ok && res.status !== 202) {
          throw new MangoError(`Mango initialize notification failed: HTTP ${res.status}`);
        }
      })();
    }
    await this.initialized;
  }

  async callTool<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
    await this.ensureInitialized();
    const result = await this.rpc<JsonRpcMessage["result"]>("tools/call", {
      name,
      arguments: args,
    });

    if (!result) throw new MangoError(`Mango ${name} returned no result`);
    if (result.isError) {
      const text = result.content?.map((block) => block.text ?? "").join(" ") ?? "";
      throw new MangoError(`Mango ${name} reported an error: ${text.slice(0, 300)}`);
    }

    if (result.structuredContent !== undefined) return result.structuredContent as T;

    const text = result.content?.find((block) => block.type === "text")?.text;
    if (text === undefined) throw new MangoError(`Mango ${name} returned no content`);
    try {
      return JSON.parse(text) as T;
    } catch {
      // Some tools legitimately return prose.
      return text as unknown as T;
    }
  }
}

/**
 * Returns null when Mango is not configured. That is a first-class supported
 * state, not an error: the objectives dashboard is fully usable without it.
 */
export function getMangoClient(): MangoClient | null {
  const token = process.env.MANGO_MCP_TOKEN;
  if (!token) return null;
  const url = process.env.MANGO_MCP_URL ?? DEFAULT_MCP_URL;
  return new McpMangoClient(url, token);
}
