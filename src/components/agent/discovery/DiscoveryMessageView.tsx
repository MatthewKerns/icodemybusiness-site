import type { ChatMessage } from "./types";
import { stripDiscoveryFence } from "@/lib/agent/discovery-prompt";

export function DiscoveryMessageView({ message }: { message: ChatMessage }) {
  const visible = stripDiscoveryFence(message.content);
  const isUser = message.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
      data-testid={`discovery-message-${message.role}`}
    >
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm leading-relaxed ${
          isUser
            ? "border border-gold/30 bg-gold/10 text-text-primary"
            : "border border-border bg-bg-secondary text-text-primary"
        }`}
      >
        {visible || (message.pending ? "…" : "")}
      </div>
    </div>
  );
}
