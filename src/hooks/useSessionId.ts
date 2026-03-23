"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "icmb_session_id";

export function useSessionId(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    try {
      let id = localStorage.getItem(STORAGE_KEY);
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, id);
      }
      setSessionId(id);
    } catch {
      // localStorage unavailable (SSR, private browsing, etc.)
    }
  }, []);

  return sessionId;
}
