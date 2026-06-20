"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { AgentErrorBoundary } from "./AgentErrorBoundary";
import { MessageSquare, Mic } from "lucide-react";

function AgentSkeleton() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  );
}

const RetellChatWidget = dynamic(() => import("./RetellChatWidget"), {
  ssr: false,
  loading: () => <AgentSkeleton />,
});

const RetellVoiceWidget = dynamic(() => import("./RetellVoiceWidget"), {
  ssr: false,
  loading: () => <AgentSkeleton />,
});

type AgentMode = "chat" | "voice";

export function AgentSection() {
  const [mode, setMode] = useState<AgentMode>("chat");

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <h2 className="text-h2 font-bold text-text-primary">Talk to Alex</h2>
        <p className="mt-2 text-text-muted">
          Our AI assistant can help you find the right solution
        </p>
      </div>

      <div className="rounded-xl border border-border bg-bg-secondary transition-colors hover:border-gold/30">
        {/* Mode toggle */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setMode("chat")}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              mode === "chat"
                ? "border-b-2 border-gold text-gold"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </button>
          <button
            onClick={() => setMode("voice")}
            className={`flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              mode === "voice"
                ? "border-b-2 border-gold text-gold"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Mic className="h-4 w-4" />
            Voice
          </button>
        </div>

        {/* Widget content — each widget gets its own error boundary */}
        <div className={mode === "chat" ? "block" : "hidden"}>
          <AgentErrorBoundary>
            <RetellChatWidget />
          </AgentErrorBoundary>
        </div>
        <div className={mode === "voice" ? "block" : "hidden"}>
          <AgentErrorBoundary>
            <RetellVoiceWidget />
          </AgentErrorBoundary>
        </div>
      </div>
    </div>
  );
}
