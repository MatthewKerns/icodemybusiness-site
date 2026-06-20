"use client";

import { useEffect, useRef, useState } from "react";

const LOAD_TIMEOUT_MS = 8000;

export default function RetellChatWidget() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    const publicKey = process.env.NEXT_PUBLIC_RETELL_PUBLIC_KEY;
    const agentId = process.env.NEXT_PUBLIC_RETELL_AGENT_ID;

    if (!publicKey || !agentId) {
      console.error("Retell public key or agent ID not configured");
      setHasError(true);
      return;
    }

    // Read UTM params for source attribution
    const params = new URLSearchParams(window.location.search);
    const source = params.get("utm_source") || params.get("ref") || undefined;

    const script = document.createElement("script");
    script.src = "https://cdn.retellai.com/chat-widget.js";
    script.async = true;
    script.dataset.agentId = agentId;
    script.dataset.publicKey = publicKey;
    if (source) {
      script.dataset.metadata = JSON.stringify({ source });
    }

    script.onload = () => setIsLoaded(true);
    script.onerror = () => {
      console.error("Failed to load Retell chat widget script");
      setHasError(true);
    };

    // Timeout: if script hasn't loaded after LOAD_TIMEOUT_MS, show error
    const timeout = setTimeout(() => {
      if (!scriptRef.current) return;
      setHasError(true);
    }, LOAD_TIMEOUT_MS);

    containerRef.current?.appendChild(script);
    scriptRef.current = script;

    return () => {
      clearTimeout(timeout);
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, []);

  // Throw to trigger AgentErrorBoundary
  if (hasError) {
    throw new Error("Retell chat widget failed to load");
  }

  return (
    <div className="min-h-[400px] w-full">
      {!isLoaded && (
        <div className="flex h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
        </div>
      )}
      <div ref={containerRef} id="retell-chat-container" className="w-full" />
    </div>
  );
}
