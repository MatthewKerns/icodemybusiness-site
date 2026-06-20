import { useMemo, useReducer } from "react";
import type {
  AttachedFile,
  ChatMessage,
  Issue,
  Top3Action,
  Top3SessionState,
} from "./types";

export const MAX_FILES = 5;
export const MAX_TOTAL_BYTES = 15 * 1024 * 1024;
export const MAX_BYTES_PER_FILE = 5 * 1024 * 1024;

export function initialState(sessionId: string): Top3SessionState {
  return {
    sessionId,
    messages: [],
    files: [],
    draftIssues: [],
    isStreaming: false,
    isConfirmed: false,
    emailSent: false,
  };
}

export function top3Reducer(
  state: Top3SessionState,
  action: Top3Action
): Top3SessionState {
  switch (action.type) {
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
      return {
        ...state,
        messages: [...state.messages, msg],
        isStreaming: true,
      };
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
    case "issues-update": {
      return { ...state, draftIssues: action.issues.slice(0, 3) };
    }
    case "file-attached": {
      if (state.files.length >= MAX_FILES) return state;
      const totalBytes =
        state.files.reduce((s, f) => s + f.size, 0) + action.file.size;
      if (totalBytes > MAX_TOTAL_BYTES) return state;
      return { ...state, files: [...state.files, action.file] };
    }
    case "file-remove": {
      return {
        ...state,
        files: state.files.filter((f) => f.storageId !== action.storageId),
      };
    }
    case "confirm": {
      return { ...state, isConfirmed: true };
    }
    case "email-sent": {
      return { ...state, email: action.email, emailSent: true };
    }
    case "error": {
      return { ...state, error: action.message, isStreaming: false };
    }
    case "reset-error": {
      return { ...state, error: undefined };
    }
  }
}

export function canAcceptFile(
  state: Top3SessionState,
  size: number
): { ok: boolean; reason?: string } {
  if (state.files.length >= MAX_FILES) {
    return { ok: false, reason: `Max ${MAX_FILES} files` };
  }
  if (size > MAX_BYTES_PER_FILE) {
    return { ok: false, reason: "File exceeds 5MB" };
  }
  const projected = state.files.reduce((s, f) => s + f.size, 0) + size;
  if (projected > MAX_TOTAL_BYTES) {
    return { ok: false, reason: "Total uploads exceed 15MB" };
  }
  return { ok: true };
}

export function allThreeConfirmed(issues: Issue[]): boolean {
  if (issues.length !== 3) return false;
  return issues.every((i) => i.title.trim().length > 0 && i.evidence.trim().length > 0);
}

export function useTop3Session(sessionId: string) {
  const [state, dispatch] = useReducer(
    top3Reducer,
    sessionId,
    initialState
  );

  const readyToFinish = useMemo(
    () => allThreeConfirmed(state.draftIssues) && !state.isStreaming,
    [state.draftIssues, state.isStreaming]
  );

  return { state, dispatch, readyToFinish };
}

export type { AttachedFile };
