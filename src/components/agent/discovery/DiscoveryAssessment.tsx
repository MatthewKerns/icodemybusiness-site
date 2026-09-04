"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Send } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import {
  coerceDiscoveryState,
  type DiscoveryState,
} from "@/lib/agent/discovery-prompt";
import {
  DISCOVERY_STAGE,
  questionForStage,
} from "@/content/discovery-questions";
import { ensureDiscoverySessionId } from "@/lib/agent/discovery-session-id";
import { useDiscoverySession } from "./useDiscoverySession";
import { DiscoveryStepper } from "./DiscoveryStepper";
import { DiscoveryMessageView } from "./DiscoveryMessageView";
import { DiscoveryRecap } from "./DiscoveryRecap";
import { DiscoveryResultView, type PublicAssessment } from "./DiscoveryResultView";
import type { ChatMessage } from "./types";

const AGENT_KIND = "discovery-assessment";

export type DiscoverySource = "homepage" | "assessment-page";

function makeId() {
  return `m_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

/**
 * The Discovery Assessment: five fixed questions, one at a time, with Claude
 * drilling down at most twice per question, then a recap in the visitor's
 * words, then a report. Mounted at `#top3` on the homepage and at
 * `/assessment`; both share the session in sessionStorage.
 *
 * Stage state is owned by the server. This component only mirrors it.
 */
export function DiscoveryAssessment({ source }: { source: DiscoverySource }) {
  const [sessionId, setSessionId] = useState("");
  const { state, dispatch } = useDiscoverySession(sessionId);
  const ensureSession = useMutation(api.agentSessions.getOrCreate);
  const appendMessage = useMutation(api.agentSessions.appendMessage);
  const confirmRecap = useMutation(api.discoveryAssessments.confirmRecap);
  const submit = useMutation(api.discoveryAssessments.submit);
  const track = useTrackEvent();

  const persisted = useQuery(
    api.agentSessions.getForServer,
    sessionId ? { sessionId } : "skip"
  );
  const assessment = useQuery(
    api.discoveryAssessments.getBySessionId,
    sessionId ? { sessionId } : "skip"
  ) as PublicAssessment | null | undefined;

  const [input, setInput] = useState("");
  const [degraded, setDegraded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);
  const anchorRef = useRef(false);
  const sessionIdRef = useRef("");

  const returnPath = source === "assessment-page" ? "/assessment" : "/#top3";

  useEffect(() => {
    // Read-or-create for this tab. A resume from the portal has already written
    // the adopted id here, so this picks it up without the component ever
    // needing to swap ids after mount.
    const id = ensureDiscoverySessionId();
    setSessionId(id);
    sessionIdRef.current = id;
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    void ensureSession({ sessionId, agentKind: AGENT_KIND, source });
  }, [sessionId, ensureSession, source]);

  // Replay the persisted transcript once (survives the sign-up redirect), and
  // open the first question if the session is brand new.
  useEffect(() => {
    if (hydratedRef.current || !persisted) return;
    hydratedRef.current = true;
    const msgs: ChatMessage[] = (persisted.messages ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        id: m._id as string,
        role: m.role as "user" | "assistant",
        content: m.content,
        createdAt: m.timestamp,
      }));
    const discovery = coerceDiscoveryState(persisted.session?.discoveryState);
    dispatch({ type: "hydrate", messages: msgs, discovery });

    if (msgs.length === 0 && discovery.stage === 0 && !anchorRef.current) {
      anchorRef.current = true;
      const q = questionForStage(0)!;
      dispatch({ type: "anchor", messageId: makeId(), text: q.anchor });
      void appendMessage({
        sessionId: sessionIdRef.current,
        role: "assistant",
        content: q.anchor,
      }).catch(() => {
        // The question is on screen either way; persistence is best effort.
      });
    }
  }, [persisted, dispatch, appendMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
    // state.discovery is in here because the recap card lives inside this
    // scroller and is five labelled rows tall: after a correction rewrites the
    // answers, nothing else changes and the confirm buttons would otherwise
    // stay below the fold.
  }, [state.messages, state.isStreaming, state.discovery]);

  const streamTurn = useCallback(
    async (content: string, mode: "answer" | "correction") => {
      const sid = sessionIdRef.current;
      if (!sid || state.isStreaming) return;
      const userMsgId = makeId();
      const assistantMsgId = makeId();
      dispatch({ type: "user-send", messageId: userMsgId, content });
      dispatch({ type: "assistant-start", messageId: assistantMsgId });

      try {
        const res = await fetch("/api/agent/discovery/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid, userMessage: content, mode }),
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          dispatch({ type: "error", message: err.error ?? "Request failed" });
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
              const text = (payload as { text: string }).text;
              dispatch({
                type: "assistant-delta",
                messageId: assistantMsgId,
                chunk: text,
              });
            } else if (type === "reset") {
              // The model failed mid-reply; drop the partial text.
              dispatch({
                type: "assistant-replace",
                messageId: assistantMsgId,
                content: "",
              });
            } else if (type === "state") {
              const p = payload as {
                state: DiscoveryState;
                advanced: boolean;
                forced: boolean;
                anchor: string | null;
                degraded: boolean;
                truncated?: boolean;
                usage?: {
                  input: number;
                  output: number;
                  cacheRead: number;
                  cacheWrite: number;
                } | null;
              };
              dispatch({ type: "state-update", discovery: p.state });
              if (p.degraded) setDegraded(true);
              if (p.usage) {
                track(
                  ANALYTICS_EVENTS.DISCOVERY_MODEL_USAGE,
                  {
                    stage: p.state.stage,
                    inputTokens: p.usage.input,
                    outputTokens: p.usage.output,
                    cacheReadTokens: p.usage.cacheRead,
                    cacheWriteTokens: p.usage.cacheWrite,
                  },
                  "system"
                );
              }
              if (p.truncated) {
                // Fired outside the `advanced` branch on purpose: a truncated
                // reply loses the extraction JSON, so the stage usually does NOT
                // advance. Hanging this off discovery_stage_advanced would miss
                // the very turns it exists to catch.
                track(
                  ANALYTICS_EVENTS.DISCOVERY_EXTRACTION_TRUNCATED,
                  { stage: p.state.stage, advanced: p.advanced },
                  "system"
                );
              }
              if (p.advanced) {
                track(
                  ANALYTICS_EVENTS.DISCOVERY_STAGE_ADVANCED,
                  {
                    stage: p.state.stage,
                    followUpsUsed: state.discovery.followUpsUsed,
                    forced: p.forced,
                    degraded: p.degraded,
                  },
                  "decision"
                );
              }
              if (p.anchor) {
                dispatch({ type: "anchor", messageId: makeId(), text: p.anchor });
              }
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
    [dispatch, state.isStreaming, state.discovery.followUpsUsed, track]
  );

  const send = useCallback(() => {
    const content = input.trim();
    if (!content) return;
    setInput("");
    void streamTurn(content, "answer");
  }, [input, streamTurn]);

  const onAccepted = useCallback(
    (needsEmail: boolean) => {
      // The click itself, not the email submission. discovery_recap_confirmed
      // fires only once an address is in, so without this the visitor who
      // accepts the recap and then walks away from the form is invisible.
      track(
        ANALYTICS_EVENTS.DISCOVERY_RECAP_ACCEPTED,
        { needsEmail },
        "decision"
      );
    },
    [track]
  );

  const onCorrectionOpened = useCallback(() => {
    track(ANALYTICS_EVENTS.DISCOVERY_RECAP_CORRECTION_OPENED, {}, "decision");
  }, [track]);

  const onCorrect = useCallback(
    (text: string) => {
      // Fired here rather than in DiscoveryRecap so that component stays free
      // of the tracking hook's Clerk/Convex/router dependencies. The drop
      // between opening the box and submitting is the number worth watching.
      track(
        ANALYTICS_EVENTS.DISCOVERY_RECAP_CORRECTED,
        { chars: text.length, degraded },
        "decision"
      );
      void streamTurn(text, "correction");
    },
    [streamTurn, track, degraded]
  );

  const onSubmit = useCallback(
    async (email: string, name?: string) => {
      const sid = sessionIdRef.current;
      await confirmRecap({ sessionId: sid });
      track(ANALYTICS_EVENTS.DISCOVERY_RECAP_CONFIRMED, {}, "decision");
      await submit({ sessionId: sid, email, name, source });
      track(
        ANALYTICS_EVENTS.DISCOVERY_ASSESSMENT_COMPLETED,
        { source, degraded },
        "form"
      );
    },
    [confirmRecap, submit, track, source, degraded]
  );

  const stage = state.discovery.stage;
  const atRecap = stage === DISCOVERY_STAGE.RECAP;
  const inQuestion = !!questionForStage(stage);
  const reportReady = assessment?.status === "ready";

  return (
    <div className="flex flex-col gap-5" data-testid="discovery-assessment">
      <div className="flex flex-col gap-3">
        <DiscoveryStepper stage={stage} reportReady={reportReady} />
        {degraded && !assessment && (
          <p className="text-xs text-text-dim">
            The assistant is unavailable right now, so I&apos;m taking your
            answers exactly as you write them. The write-up still comes.
          </p>
        )}
      </div>

      {assessment ? (
        <DiscoveryResultView assessment={assessment} returnPath={returnPath} />
      ) : (
        <div className="flex min-h-[480px] flex-col rounded-xl border border-border bg-bg-secondary">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-text-primary">
              Five questions. A few minutes.
            </h3>
            <p className="text-xs text-text-muted">
              Answer in your own words. I&apos;ll ask a follow-up only when it
              sharpens the picture.
            </p>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
            {state.messages.map((m) => (
              <DiscoveryMessageView key={m.id} message={m} />
            ))}
            {state.error && (
              <div className="mb-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {state.error}
              </div>
            )}
            {atRecap && state.hydrated && (
              <div className="mt-2">
                <DiscoveryRecap
                  answers={state.discovery.answers}
                  correction={state.discovery.correction}
                  busy={state.isStreaming}
                  onCorrect={onCorrect}
                  onAccepted={onAccepted}
                  onCorrectionOpened={onCorrectionOpened}
                  onSubmit={onSubmit}
                />
              </div>
            )}
          </div>

          {inQuestion && (
            <div className="flex items-end gap-2 border-t border-border p-3">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                maxLength={2000}
                placeholder="Type your answer…"
                aria-label="Your answer"
                className="flex-1 resize-none rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:border-gold/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={send}
                disabled={state.isStreaming || !input.trim() || !state.hydrated}
                className="rounded-md bg-gold px-3 py-2 text-sm font-semibold text-bg-primary disabled:opacity-50"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
