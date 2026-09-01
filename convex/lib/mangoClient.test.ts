import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getMangoClient, MangoError } from "./mangoClient";

const ENV_KEYS = ["MANGO_MCP_TOKEN", "MANGO_MCP_URL"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  process.env.MANGO_MCP_TOKEN = "mps_test";
  process.env.MANGO_MCP_URL = "https://mango.example/mcp";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.unstubAllGlobals();
});

function json(body: unknown, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
}

/**
 * Replies to `initialize` and `notifications/initialized`, then hands each
 * `tools/call` the next queued response.
 */
function stubTransport(
  toolResponses: Response[],
  options: { sessionHeader?: string } = {},
) {
  const calls: Array<Record<string, unknown>> = [];
  let toolIndex = 0;
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
    calls.push(payload);
    if (payload.method === "initialize") {
      return json(
        { jsonrpc: "2.0", id: payload.id, result: { protocolVersion: "2025-06-18" } },
        options.sessionHeader ? { "mcp-session-id": options.sessionHeader } : {},
      );
    }
    if (payload.method === "notifications/initialized") {
      return new Response(null, { status: 202 });
    }
    return toolResponses[toolIndex++];
  });
  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock };
}

describe("getMangoClient", () => {
  it("returns null when the token is unset — a supported state, not an error", () => {
    delete process.env.MANGO_MCP_TOKEN;
    expect(getMangoClient()).toBeNull();
  });

  it("returns a client when configured", () => {
    expect(getMangoClient()).not.toBeNull();
  });
});

describe("MCP transport", () => {
  it("handshakes once and reuses it across tool calls", async () => {
    const { calls } = stubTransport([
      json({ jsonrpc: "2.0", id: 2, result: { structuredContent: { a: 1 } } }),
      json({ jsonrpc: "2.0", id: 3, result: { structuredContent: { b: 2 } } }),
    ]);
    const mango = getMangoClient()!;

    expect(await mango.callTool("get_time_summary")).toEqual({ a: 1 });
    expect(await mango.callTool("get_focus_projects")).toEqual({ b: 2 });

    const methods = calls.map((c) => c.method);
    expect(methods).toEqual([
      "initialize",
      "notifications/initialized",
      "tools/call",
      "tools/call",
    ]);
  });

  it("echoes a session id back on later requests when the server issues one", async () => {
    const { fetchMock } = stubTransport(
      [json({ jsonrpc: "2.0", id: 2, result: { structuredContent: {} } })],
      { sessionHeader: "sess-abc" },
    );
    await getMangoClient()!.callTool("get_daily_todo");

    const toolCall = fetchMock.mock.calls.at(-1)![1] as RequestInit;
    const headers = toolCall.headers as Record<string, string>;
    expect(headers["mcp-session-id"]).toBe("sess-abc");
    expect(headers.authorization).toBe("Bearer mps_test");
  });

  it("works when the server issues no session id", async () => {
    const { fetchMock } = stubTransport([
      json({ jsonrpc: "2.0", id: 2, result: { structuredContent: { ok: true } } }),
    ]);
    expect(await getMangoClient()!.callTool("get_daily_todo")).toEqual({ ok: true });

    const headers = (fetchMock.mock.calls.at(-1)![1] as RequestInit)
      .headers as Record<string, string>;
    expect(headers["mcp-session-id"]).toBeUndefined();
  });

  it("parses an SSE response and takes the frame matching the request id", async () => {
    const sse = [
      ": keep-alive",
      "event: message",
      `data: ${JSON.stringify({ jsonrpc: "2.0", id: 99, result: { structuredContent: { stale: true } } })}`,
      "",
      "event: message",
      `data: ${JSON.stringify({ jsonrpc: "2.0", id: 2, result: { structuredContent: { hours: 23.1 } } })}`,
      "",
    ].join("\n");
    stubTransport([
      new Response(sse, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      }),
    ]);

    expect(await getMangoClient()!.callTool("get_time_summary")).toEqual({ hours: 23.1 });
  });

  it("falls back to parsing the text content block", async () => {
    stubTransport([
      json({
        jsonrpc: "2.0",
        id: 2,
        result: { content: [{ type: "text", text: '{"by_category":{"paid":{"hours":40}}}' }] },
      }),
    ]);
    expect(await getMangoClient()!.callTool("get_time_summary")).toEqual({
      by_category: { paid: { hours: 40 } },
    });
  });

  it("returns prose unchanged when a tool does not answer with JSON", async () => {
    stubTransport([
      json({ jsonrpc: "2.0", id: 2, result: { content: [{ type: "text", text: "all clear" }] } }),
    ]);
    expect(await getMangoClient()!.callTool("run_check_in")).toBe("all clear");
  });

  it("throws on a tool-level error", async () => {
    stubTransport([
      json({
        jsonrpc: "2.0",
        id: 2,
        result: { isError: true, content: [{ type: "text", text: "unknown client_slug" }] },
      }),
    ]);
    await expect(getMangoClient()!.callTool("get_rocks_status")).rejects.toThrow(
      /unknown client_slug/,
    );
  });

  it("throws on a JSON-RPC error", async () => {
    stubTransport([
      json({ jsonrpc: "2.0", id: 2, error: { code: -32601, message: "Method not found" } }),
    ]);
    await expect(getMangoClient()!.callTool("nope")).rejects.toThrow(MangoError);
  });

  it("throws on a transport failure, naming the status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("bad token", { status: 401 })),
    );
    await expect(getMangoClient()!.callTool("get_time_summary")).rejects.toThrow(/401/);
  });
});
