"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { useTop3Session, canAcceptFile } from "./useTop3Session";
import { ChatMessageView } from "./ChatMessageView";
import { FileAttachmentChip } from "./FileAttachmentChip";
import { Top3SidePanel } from "./Top3SidePanel";
import { api } from "../../../../convex/_generated/api";
import { Paperclip, Send, Mail } from "lucide-react";
import type { Issue } from "./types";

function makeId() {
  return `m_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function makeSessionId() {
  if (typeof window !== "undefined") {
    const stored = window.sessionStorage.getItem("top3-session-id");
    if (stored) return stored;
    const fresh = `t3_${Math.random().toString(36).slice(2, 12)}_${Date.now()}`;
    window.sessionStorage.setItem("top3-session-id", fresh);
    return fresh;
  }
  return "";
}

export function Top3IssuesAgent() {
  const [sessionId, setSessionId] = useState("");
  const { state, dispatch, readyToFinish } = useTop3Session(sessionId);
  const ensureSession = useMutation(api.agentSessions.getOrCreate);
  const [input, setInput] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = makeSessionId();
    setSessionId(id);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    void ensureSession({
      sessionId,
      agentKind: "top3-issues",
      source: "homepage",
    });
  }, [sessionId, ensureSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [state.messages, state.isStreaming]);

  const totalBytes = useMemo(
    () => state.files.reduce((s, f) => s + f.size, 0),
    [state.files]
  );

  const send = useCallback(async () => {
    const content = input.trim();
    if (!content || !sessionId || state.isStreaming) return;
    const userMsgId = makeId();
    const assistantMsgId = makeId();
    const fileRefs = state.files.map((f) => f.storageId);
    dispatch({ type: "user-send", messageId: userMsgId, content });
    dispatch({ type: "assistant-start", messageId: assistantMsgId });
    setInput("");

    try {
      const res = await fetch("/api/agent/top3/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, userMessage: content, fileRefs }),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        dispatch({
          type: "error",
          message: err.error ?? "Chat request failed",
        });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) {
          streamDone = true;
          break;
        }
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const ev of events) {
          const line = ev.split("\n");
          const type = line[0]?.replace("event: ", "").trim();
          const dataLine = line.find((l) => l.startsWith("data: "));
          if (!type || !dataLine) continue;
          let payload: unknown;
          try {
            payload = JSON.parse(dataLine.slice(6));
          } catch {
            continue;
          }
          if (type === "delta") {
            const p = payload as { text: string };
            dispatch({
              type: "assistant-delta",
              messageId: assistantMsgId,
              chunk: p.text,
            });
          } else if (type === "issues") {
            const p = payload as { issues: Issue[] };
            dispatch({ type: "issues-update", issues: p.issues });
          } else if (type === "error") {
            const p = payload as { message: string };
            dispatch({ type: "error", message: p.message });
          }
        }
      }
      dispatch({ type: "assistant-finish", messageId: assistantMsgId });
    } catch (err) {
      dispatch({
        type: "error",
        message: err instanceof Error ? err.message : "Network error",
      });
    }
  }, [input, sessionId, state.isStreaming, state.files, dispatch]);

  const onPickFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !sessionId) return;
      const gate = canAcceptFile(state, file.size);
      if (!gate.ok) {
        dispatch({
          type: "error",
          message: gate.reason ?? "Cannot attach file",
        });
        return;
      }
      const fd = new FormData();
      fd.set("sessionId", sessionId);
      fd.set("file", file);
      const res = await fetch("/api/agent/top3/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        dispatch({ type: "error", message: err.error ?? "Upload failed" });
        return;
      }
      const meta = (await res.json()) as {
        storageId: string;
        name: string;
        size: number;
        mime: string;
        extractedChars: number;
      };
      dispatch({ type: "file-attached", file: meta });
    },
    [sessionId, state, dispatch]
  );

  const completeAndEmail = useCallback(async () => {
    if (!sessionId || !email.trim()) return;
    setCompleting(true);
    dispatch({ type: "reset-error" });
    try {
      const res = await fetch("/api/agent/top3/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          email: email.trim(),
          name: name.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }));
        dispatch({ type: "error", message: err.error ?? "Could not send" });
        return;
      }
      dispatch({ type: "email-sent", email: email.trim() });
      setCompleted(true);
    } finally {
      setCompleting(false);
    }
  }, [sessionId, email, name, dispatch]);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_320px]">
      <div className="flex min-h-[520px] flex-col rounded-xl border border-border bg-bg-secondary">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Top 3 Issues — live agent
            </h3>
            <p className="text-xs text-text-muted">
              Chat with Claude about what&apos;s draining your week. Files help.
            </p>
          </div>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {state.messages.length === 0 && (
            <div className="mt-8 text-center text-sm text-text-muted">
              Start by describing your business in one line and what&apos;s been
              draining your time this week.
            </div>
          )}
          {state.messages.map((m) => (
            <ChatMessageView key={m.id} message={m} />
          ))}
          {state.error && (
            <div className="mb-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {state.error}
            </div>
          )}
        </div>

        {state.files.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border px-4 py-2">
            {state.files.map((f) => (
              <FileAttachmentChip
                key={f.storageId}
                file={f}
                onRemove={(id) => dispatch({ type: "file-remove", storageId: id })}
              />
            ))}
            <span className="text-[10px] text-text-muted self-center">
              {Math.round(totalBytes / 1024)}KB / 15MB
            </span>
          </div>
        )}

        <div className="flex items-end gap-2 border-t border-border p-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => void onPickFile(e)}
            accept=".txt,.md,.csv,.tsv,.json,.yaml,.yml,.log,text/*,application/json,application/xml"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach file"
            className="rounded-md border border-border bg-bg-primary p-2 text-text-muted hover:text-gold"
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder="Type your answer…"
            className="flex-1 resize-none rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={state.isStreaming || !input.trim()}
            className="rounded-md bg-gold px-3 py-2 text-sm font-semibold text-bg-primary disabled:opacity-50"
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Top3SidePanel issues={state.draftIssues} />
        {readyToFinish && !completed && (
          <div className="flex flex-col gap-2 rounded-xl border border-gold/30 bg-gold/5 p-4">
            <h4 className="text-sm font-semibold text-gold">
              Email me this summary
            </h4>
            <p className="text-xs text-text-muted">
              We&apos;ll send the three issues to your inbox. No account needed.
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="rounded-md border border-border bg-bg-primary px-3 py-2 text-sm"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="rounded-md border border-border bg-bg-primary px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void completeAndEmail()}
              disabled={completing || !email.trim()}
              className="flex items-center justify-center gap-2 rounded-md bg-gold px-3 py-2 text-sm font-semibold text-bg-primary disabled:opacity-50"
            >
              <Mail className="h-4 w-4" />
              {completing ? "Sending…" : "Send me the summary"}
            </button>
          </div>
        )}
        {completed && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs text-emerald-300">
            Summary sent. Check your inbox (and spam folder).
          </div>
        )}
      </div>
    </div>
  );
}
