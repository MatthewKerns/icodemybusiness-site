import type { ChatMessage } from "./types";
import { stripIntakeFence } from "@/lib/agent/ecommerce-prompt";

export function EcommerceMessageView({ message }: { message: ChatMessage }) {
  const visible = stripIntakeFence(message.content);
  const isUser = message.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
      data-testid={`ecom-message-${message.role}`}
    >
      <div
        className={`max-w-[80%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm ${
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
