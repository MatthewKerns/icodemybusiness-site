import type { ChatMessage } from "./types";
import { stripIssuesFence } from "@/lib/agent/top3-prompt";

export function ChatMessageView({ message }: { message: ChatMessage }) {
  const visible = stripIssuesFence(message.content);
  const isUser = message.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
      data-testid={`chat-message-${message.role}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 whitespace-pre-wrap text-sm ${
          isUser
            ? "bg-gold/10 border border-gold/30 text-text-primary"
            : "bg-bg-secondary border border-border text-text-primary"
        }`}
      >
        {visible || (message.pending ? "…" : "")}
      </div>
    </div>
  );
}
