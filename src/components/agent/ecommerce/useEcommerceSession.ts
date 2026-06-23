import { useReducer } from "react";
import type {
  ChatMessage,
  EcommerceAction,
  EcommerceSessionState,
} from "./types";

export function initialState(sessionId: string): EcommerceSessionState {
  return { sessionId, messages: [], isStreaming: false, ready: false };
}

export function ecommerceReducer(
  state: EcommerceSessionState,
  action: EcommerceAction
): EcommerceSessionState {
  switch (action.type) {
    case "hydrate": {
      // Restore a prior session (e.g. after the sign-up redirect). Never clobber
      // live local state if the user has already started typing this mount.
      if (state.messages.length > 0) return state;
      return {
        ...state,
        messages: action.messages,
        ready: state.ready || action.ready,
        profile: action.profile ?? state.profile,
      };
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
    case "assistant-finish": {
      return {
        ...state,
        isStreaming: false,
        messages: state.messages.map((m) =>
          m.id === action.messageId ? { ...m, pending: false } : m
        ),
      };
    }
    case "profile-update": {
      // Once the agent signals it has enough, keep "ready" latched on.
      return {
        ...state,
        profile: action.profile,
        ready: state.ready || action.ready,
      };
    }
    case "error": {
      return { ...state, error: action.message, isStreaming: false };
    }
    case "reset-error": {
      return { ...state, error: undefined };
    }
  }
}

export function useEcommerceSession(sessionId: string) {
  const [state, dispatch] = useReducer(
    ecommerceReducer,
    sessionId,
    initialState
  );
  return { state, dispatch };
}
