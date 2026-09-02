import type { DiscoveryState } from "@/lib/agent/discovery-prompt";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  pending?: boolean;
}

export interface DiscoverySessionState {
  sessionId: string;
  messages: ChatMessage[];
  discovery: DiscoveryState;
  isStreaming: boolean;
  /** Set once the persisted session has been replayed into local state. */
  hydrated: boolean;
  error?: string;
}

export type DiscoveryAction =
  | {
      type: "hydrate";
      messages: ChatMessage[];
      discovery: DiscoveryState;
    }
  | { type: "anchor"; messageId: string; text: string }
  | { type: "user-send"; messageId: string; content: string }
  | { type: "assistant-start"; messageId: string }
  | { type: "assistant-delta"; messageId: string; chunk: string }
  | { type: "assistant-replace"; messageId: string; content: string }
  | { type: "assistant-finish"; messageId: string }
  | { type: "state-update"; discovery: DiscoveryState }
  | { type: "error"; message: string }
  | { type: "reset-error" };

export type { DiscoveryState };
