export type Severity = "low" | "medium" | "high";

export interface Issue {
  title: string;
  severity: Severity;
  evidence: string;
}

export interface AttachedFile {
  storageId: string;
  name: string;
  size: number;
  mime: string;
  extractedChars: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  pending?: boolean;
}

export interface Top3SessionState {
  sessionId: string;
  messages: ChatMessage[];
  files: AttachedFile[];
  draftIssues: Issue[];
  isStreaming: boolean;
  isConfirmed: boolean;
  email?: string;
  emailSent: boolean;
  error?: string;
}

export type Top3Action =
  | { type: "user-send"; content: string; messageId: string }
  | { type: "assistant-start"; messageId: string }
  | { type: "assistant-delta"; messageId: string; chunk: string }
  | { type: "assistant-finish"; messageId: string }
  | { type: "issues-update"; issues: Issue[] }
  | { type: "file-attached"; file: AttachedFile }
  | { type: "file-remove"; storageId: string }
  | { type: "confirm" }
  | { type: "email-sent"; email: string }
  | { type: "error"; message: string }
  | { type: "reset-error" };
