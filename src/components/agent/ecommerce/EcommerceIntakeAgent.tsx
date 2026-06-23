"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useEcommerceSession } from "./useEcommerceSession";
import { EcommerceMessageView } from "./EcommerceMessageView";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { Send, Check, Loader2, UserPlus } from "lucide-react";

const APPLY_PATH = "/custom-tools";

function makeId() {
  return `m_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function makeSessionId() {
  if (typeof window !== "undefined") {
    const stored = window.sessionStorage.getItem("ecom-intake-session-id");
    if (stored) return stored;
    const fresh = `ec_${Math.random().toString(36).slice(2, 12)}_${Date.now()}`;
    window.sessionStorage.setItem("ecom-intake-session-id", fresh);
    return fresh;
  }
  return "";
}

export function EcommerceIntakeAgent() {
  const [sessionId, setSessionId] = useState("");
  const { state, dispatch } = useEcommerceSession(sessionId);
  const ensureSession = useMutation(api.agentSessions.getOrCreate);
  const submitApplication = useMutation(api.applications.submitApplication);
  const track = useTrackEvent();
  const { user, isSignedIn } = useUser();
  const appStatus = useQuery(
    api.applications.getApplicationStatusBySession,
    sessionId ? { sessionId } : "skip"
  );
  // Persisted session — used once to rehydrate the chat after the sign-up
  // redirect (the in-memory reducer is otherwise empty on remount).
  const persisted = useQuery(
    api.agentSessions.getForServer,
    sessionId ? { sessionId } : "skip"
  );
  const hydratedRef = useRef(false);

  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true); // is the view "stuck" to the bottom?
  const programmaticRef = useRef(false);
  const queueRef = useRef<string[]>([]);
  const runningRef = useRef(false);
  const sessionIdRef = useRef("");

  useEffect(() => {
    const id = makeSessionId();
    setSessionId(id);
    sessionIdRef.current = id;
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    sessionIdRef.current = sessionId;
    void ensureSession({
      sessionId,
      agentKind: "ecommerce-intake",
      source: "resources",
    });
  }, [sessionId, ensureSession]);

  // Rehydrate once from the persisted session (survives the sign-up redirect).
  useEffect(() => {
    if (hydratedRef.current || !persisted) return;
    hydratedRef.current = true;
    const msgs = (persisted.messages ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        id: m._id as string,
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.timestamp,
      }));
    const ready = !!persisted.session?.intakeReady;
    if (msgs.length > 0 || ready) {
      dispatch({
        type: "hydrate",
        messages: msgs,
        ready,
        profile: persisted.session?.intakeProfile as
          | Record<string, unknown>
          | undefined,
      });
    }
  }, [persisted, dispatch]);

  // Auto-follow new output ONLY while the user is stuck to the bottom. If they
  // scrolled up to read, we leave their position alone (they took control).
  useEffect(() => {
    if (!stickRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    programmaticRef.current = true;
    el.scrollTop = el.scrollHeight;
    requestAnimationFrame(() => {
      programmaticRef.current = false;
    });
  }, [state.messages, state.isStreaming]);

  const onScroll = useCallback(() => {
    if (programmaticRef.current) return; // ignore our own scrolls
    const el = scrollRef.current;
    if (!el) return;
    // Re-engage auto-follow only when the user returns near the bottom.
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }, []);

  const streamOne = useCallback(
    async (content: string, assistantMsgId: string) => {
      const sid = sessionIdRef.current;
      try {
        const res = await fetch("/api/agent/ecommerce/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid, userMessage: content }),
        });
        if (!res.ok || !res.body) {
          const err = await res
            .json()
            .catch(() => ({ error: "Request failed" }));
          dispatch({ type: "error", message: err.error ?? "Chat failed" });
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let done = false;
        while (!done) {
          const { done: rdone, value } = await reader.read();
          if (rdone) {
            done = true;
            break;
          }
          buf += decoder.decode(value, { stream: true });
          const events = buf.split("\n\n");
          buf = events.pop() ?? "";
          for (const ev of events) {
            const lines = ev.split("\n");
            const type = lines[0]?.replace("event: ", "").trim();
            const dataLine = lines.find((l) => l.startsWith("data: "));
            if (!type || !dataLine) continue;
            let payload: unknown;
            try {
              payload = JSON.parse(dataLine.slice(6));
            } catch {
              continue;
            }
            if (type === "delta") {
              dispatch({
                type: "assistant-delta",
                messageId: assistantMsgId,
                chunk: (payload as { text: string }).text,
              });
            } else if (type === "profile") {
              const p = payload as {
                profile: Record<string, unknown>;
                ready: boolean;
              };
              dispatch({
                type: "profile-update",
                profile: p.profile,
                ready: p.ready,
              });
            } else if (type === "error") {
              dispatch({
                type: "error",
                message: (payload as { message: string }).message,
              });
            }
          }
        }
      } catch (err) {
        dispatch({
          type: "error",
          message: err instanceof Error ? err.message : "Network error",
        });
      } finally {
        dispatch({ type: "assistant-finish", messageId: assistantMsgId });
      }
    },
    [dispatch]
  );

  // Drain the queued messages one at a time. The send button stays enabled
  // while the agent is responding — extra sends pile into the queue.
  const drainQueue = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        const content = queueRef.current.shift()!;
        const assistantMsgId = makeId();
        dispatch({ type: "assistant-start", messageId: assistantMsgId });
        await streamOne(content, assistantMsgId);
      }
    } finally {
      runningRef.current = false;
    }
  }, [dispatch, streamOne]);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || !sessionIdRef.current) return;
    dispatch({ type: "user-send", content, messageId: makeId() });
    setInput("");
    stickRef.current = true; // sending re-engages auto-follow
    queueRef.current.push(content);
    void drainQueue();
  }, [input, dispatch, drainQueue]);

  const handleSubmitApplication = useCallback(async () => {
    if (!isSignedIn || !user) return;
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) return;
    setSubmitting(true);
    try {
      await submitApplication({
        email,
        name: user.fullName ?? undefined,
        sessionId: sessionIdRef.current,
        clerkUserId: user.id,
      });
      track(
        ANALYTICS_EVENTS.ECOMMERCE_INTAKE_COMPLETED,
        { intakeSessionId: sessionIdRef.current },
        "form"
      );
    } finally {
      setSubmitting(false);
    }
  }, [isSignedIn, user, submitApplication, track]);

  const alreadySubmitted = !!appStatus;

  return (
    <div className="flex min-h-[560px] flex-col rounded-xl border border-border bg-bg-secondary">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-text-primary">
          Custom E-Commerce Tools — intake
        </h3>
        <p className="text-xs text-text-muted">
          Tell us about your store. This is a quick chat to scope your tools — we
          build them in the background and email you the opportunities.
        </p>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto p-4"
      >
        {state.messages.length === 0 && (
          <div className="mt-8 text-center text-sm text-text-muted">
            What do you sell and where (Amazon, Shopify…), and what part of
            running the store eats the most of your time?
          </div>
        )}
        {state.messages.map((m) => (
          <EcommerceMessageView key={m.id} message={m} />
        ))}
        {state.error && (
          <div className="mb-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {state.error}
          </div>
        )}
      </div>

      {/* Account + submit CTA — appears once intake has enough context */}
      {state.ready && (
        <div className="border-t border-gold/30 bg-gold/5 px-4 py-3">
          {alreadySubmitted ? (
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <Check className="h-4 w-4" />
              <span>
                Application submitted
                {appStatus?.followupEmailSent
                  ? " — check your email for your automation opportunities."
                  : " — we're processing it and will email you shortly."}
              </span>
            </div>
          ) : !isSignedIn ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-primary">
                Got it — that&apos;s enough to start scoping your tools. Create a
                free account to submit your application.
              </p>
              <button
                type="button"
                onClick={() => {
                  window.location.href = `/sign-up?redirect_url=${encodeURIComponent(APPLY_PATH)}`;
                }}
                className="inline-flex w-fit items-center gap-2 rounded-md bg-gold px-3 py-2 text-sm font-semibold text-bg-primary"
              >
                <UserPlus className="h-4 w-4" />
                Create free account
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-text-primary">
                Ready to submit — it&apos;s free. We&apos;ll process your intake
                and email your automation opportunities.
              </p>
              <button
                type="button"
                onClick={() => void handleSubmitApplication()}
                disabled={submitting}
                className="inline-flex w-fit items-center gap-2 rounded-md bg-gold px-3 py-2 text-sm font-semibold text-bg-primary disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Submit application
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={2}
          placeholder={
            state.isStreaming
              ? "Keep typing — your messages queue up…"
              : "Type your answer…"
          }
          className="flex-1 resize-none rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/60 focus:outline-none"
        />
        {/* Send stays enabled while the agent responds (messages queue). */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!input.trim()}
          className="rounded-md bg-gold px-3 py-2 text-sm font-semibold text-bg-primary disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
