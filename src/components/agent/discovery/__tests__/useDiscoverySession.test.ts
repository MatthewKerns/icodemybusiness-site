import { describe, it, expect } from "vitest";
import { discoveryReducer, initialState } from "../useDiscoverySession";
import { initialDiscoveryState } from "@/lib/agent/discovery-prompt";

describe("discoveryReducer", () => {
  it("pushes the anchor question as an assistant message", () => {
    const s = discoveryReducer(initialState("s"), {
      type: "anchor",
      messageId: "a0",
      text: "What's the biggest thing eating your week right now?",
    });
    expect(s.messages).toHaveLength(1);
    expect(s.messages[0]).toMatchObject({
      role: "assistant",
      content: "What's the biggest thing eating your week right now?",
    });
  });

  it("streams assistant deltas into one message and finishes", () => {
    let s = discoveryReducer(initialState("s"), {
      type: "assistant-start",
      messageId: "a1",
    });
    expect(s.isStreaming).toBe(true);
    s = discoveryReducer(s, { type: "assistant-delta", messageId: "a1", chunk: "Got " });
    s = discoveryReducer(s, { type: "assistant-delta", messageId: "a1", chunk: "it." });
    s = discoveryReducer(s, { type: "assistant-finish", messageId: "a1" });
    expect(s.isStreaming).toBe(false);
    expect(s.messages[0].content).toBe("Got it.");
    expect(s.messages[0].pending).toBe(false);
  });

  it("replaces a partial reply on a degraded turn", () => {
    let s = discoveryReducer(initialState("s"), {
      type: "assistant-start",
      messageId: "a1",
    });
    s = discoveryReducer(s, { type: "assistant-delta", messageId: "a1", chunk: "half a sen" });
    s = discoveryReducer(s, { type: "assistant-replace", messageId: "a1", content: "" });
    expect(s.messages[0].content).toBe("");
  });

  it("applies the server's state verbatim", () => {
    const discovery = { ...initialDiscoveryState(), stage: 3, followUpsUsed: 1 };
    const s = discoveryReducer(initialState("s"), { type: "state-update", discovery });
    expect(s.discovery).toEqual(discovery);
  });

  it("hydrates an empty session from the persisted transcript", () => {
    const discovery = { ...initialDiscoveryState(), stage: 2 };
    const s = discoveryReducer(initialState("s"), {
      type: "hydrate",
      messages: [
        { id: "m1", role: "assistant", content: "Q1", createdAt: 1 },
        { id: "m2", role: "user", content: "A1", createdAt: 2 },
      ],
      discovery,
    });
    expect(s.hydrated).toBe(true);
    expect(s.messages).toHaveLength(2);
    expect(s.discovery.stage).toBe(2);
  });

  it("never clobbers a live conversation with a late hydration", () => {
    let s = discoveryReducer(initialState("s"), {
      type: "user-send",
      messageId: "u1",
      content: "typing already",
    });
    s = discoveryReducer(s, {
      type: "hydrate",
      messages: [{ id: "m1", role: "assistant", content: "old", createdAt: 1 }],
      discovery: { ...initialDiscoveryState(), stage: 4 },
    });
    expect(s.hydrated).toBe(true);
    expect(s.messages.map((m) => m.content)).toEqual(["typing already"]);
    expect(s.discovery.stage).toBe(0);
  });

  it("error stops streaming and reset-error clears it", () => {
    let s = discoveryReducer(
      { ...initialState("s"), isStreaming: true },
      { type: "error", message: "nope" }
    );
    expect(s.isStreaming).toBe(false);
    expect(s.error).toBe("nope");
    s = discoveryReducer(s, { type: "reset-error" });
    expect(s.error).toBeUndefined();
  });
});
