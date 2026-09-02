import { useReducer } from "react";
import { initialDiscoveryState } from "@/lib/agent/discovery-prompt";
import type {
  ChatMessage,
  DiscoveryAction,
  DiscoverySessionState,
} from "./types";

export function initialState(sessionId: string): DiscoverySessionState {
  return {
    sessionId,
    messages: [],
    discovery: initialDiscoveryState(),
    isStreaming: false,
    hydrated: false,
  };
}

/**
 * Client-side mirror of the conversation. Stage state only ever arrives from
 * the server (`state-update`); nothing here re-derives it.
 */
export function discoveryReducer(
  state: DiscoverySessionState,
  action: DiscoveryAction
): DiscoverySessionState {
  switch (action.type) {
    case "hydrate": {
      // A live conversation must never be clobbered by a late hydration.
      if (state.hydrated || state.messages.length > 0 || state.isStreaming) {
        return { ...state, hydrated: true };
      }
      return {
        ...state,
        messages: action.messages,
        discovery: action.discovery,
        hydrated: true,
      };
    }
    case "anchor": {
      const msg: ChatMessage = {
        id: action.messageId,
        role: "assistant",
        content: action.text,
        createdAt: Date.now(),
      };
      return { ...state, messages: [...state.messages, msg] };
    }
    case "user-send": {
      const msg: ChatMessage = {
        id: action.messageId,
        role: "user",
        content: action.content,
        createdAt: Date.now(),
      };
      return { ...state, messages: [...state.messages, msg], error: undefined };
    }
    case "assistant-start": {
      const msg: ChatMessage = {
        id: action.messageId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        pending: true,
      };
      return { ...state, messages: [...state.messages, msg], isStreaming: true };
    }
    case "assistant-delta": {
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId
            ? { ...m, content: m.content + action.chunk }
            : m
        ),
      };
    }
    case "assistant-replace": {
      // The server dropped a partial model reply (degraded turn).
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, content: action.content } : m
        ),
      };
    }
    case "assistant-finish": {
      return {
        ...state,
        isStreaming: false,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, pending: false } : m
        ),
      };
    }
    case "state-update": {
      return { ...state, discovery: action.discovery };
    }
    case "error": {
      return { ...state, error: action.message, isStreaming: false };
    }
    case "reset-error": {
      return { ...state, error: undefined };
    }
  }
}

export function useDiscoverySession(sessionId: string) {
  const [state, dispatch] = useReducer(
    discoveryReducer,
    sessionId,
    initialState
  );
  return { state, dispatch };
}
