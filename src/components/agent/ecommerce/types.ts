export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  pending?: boolean;
}

export interface EcommerceSessionState {
  sessionId: string;
  messages: ChatMessage[];
  isStreaming: boolean;
  profile?: Record<string, unknown>;
  ready: boolean;
  error?: string;
}

export type EcommerceAction =
  | {
      type: "hydrate";
      messages: ChatMessage[];
      ready: boolean;
      profile?: Record<string, unknown>;
    }
  | { type: "user-send"; content: string; messageId: string }
  | { type: "assistant-start"; messageId: string }
  | { type: "assistant-delta"; messageId: string; chunk: string }
  | { type: "assistant-finish"; messageId: string }
  | { type: "profile-update"; profile: Record<string, unknown>; ready: boolean }
  | { type: "error"; message: string }
  | { type: "reset-error" };
