"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";

type VoiceStatus = "idle" | "connecting" | "active" | "ended" | "error";
type AgentTalkingState = "listening" | "speaking";

export default function RetellVoiceWidget() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [agentState, setAgentState] = useState<AgentTalkingState>("listening");
  const [errorMessage, setErrorMessage] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stopCall();
        clientRef.current = null;
      }
    };
  }, []);

  const startCall = useCallback(async () => {
    setStatus("connecting");
    setErrorMessage("");

    try {
      // Request microphone permission
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Get access token from backend
      const res = await fetch("/api/retell/create-call", { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to create voice call");
      }
      const { access_token } = await res.json();

      // Import SDK dynamically to keep bundle size down
      const { RetellWebClient } = await import("retell-client-js-sdk");
      const retellClient = new RetellWebClient();
      clientRef.current = retellClient;

      retellClient.on("call_started", () => {
        setStatus("active");
        setAgentState("listening");
      });

      retellClient.on("call_ended", () => {
        setStatus("ended");
        clientRef.current = null;
      });

      retellClient.on("error", (error: unknown) => {
        console.error("Retell voice error:", error);
        setErrorMessage("Voice call encountered an error. Please try again.");
        setStatus("error");
        clientRef.current = null;
      });

      retellClient.on("agent_start_talking", () => {
        setAgentState("speaking");
      });

      retellClient.on("agent_stop_talking", () => {
        setAgentState("listening");
      });

      // Token expires in 30 seconds — start immediately
      await retellClient.startCall({ accessToken: access_token });
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access is required for voice chat. Please allow microphone access and try again."
          : "Failed to start voice call. Please try again.";
      setErrorMessage(message);
      setStatus("error");
    }
  }, []);

  const stopCall = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.stopCall();
      clientRef.current = null;
    }
    setStatus("ended");
  }, []);

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8">
      {/* Status indicator */}
      {status === "active" && (
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-gold" />
          </span>
          <p className="text-sm text-text-muted">
            {agentState === "speaking"
              ? "Alex is speaking..."
              : "Alex is listening..."}
          </p>
        </div>
      )}

      {status === "connecting" && (
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
          <p className="text-sm text-text-muted">Connecting to Alex...</p>
        </div>
      )}

      {status === "ended" && (
        <p className="text-sm text-text-muted">
          Call ended. Thanks for chatting with Alex!
        </p>
      )}

      {/* Error message */}
      {errorMessage && (
        <p className="max-w-sm text-center text-sm text-error">
          {errorMessage}
        </p>
      )}

      {/* Action button */}
      {status === "idle" || status === "error" || status === "ended" ? (
        <button
          onClick={() => void startCall()}
          className="flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          <Mic className="h-5 w-5" />
          {status === "ended" ? "Call Again" : "Start Voice Chat"}
        </button>
      ) : status === "active" ? (
        <button
          onClick={stopCall}
          className="flex items-center gap-2 rounded-lg border border-error px-6 py-3 font-medium text-error transition-colors hover:bg-error/10"
        >
          <MicOff className="h-5 w-5" />
          End Call
        </button>
      ) : null}

      {/* Helper text */}
      {status === "idle" && (
        <p className="max-w-sm text-center text-xs text-text-dim">
          Click to start a voice conversation with Alex. Microphone access is
          required.
        </p>
      )}
    </div>
  );
}
