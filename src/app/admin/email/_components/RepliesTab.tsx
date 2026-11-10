"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Empty, Field, NativeSelect, REPLY_LABEL, ago, errorText, fmtDateTime } from "./shared";
import type { PersonRef } from "./PersonSheet";

const REPLY_OPTIONS = Object.entries(REPLY_LABEL).map(([value, label]) => ({ value, label }));

const CATEGORY_TINT: Record<string, string> = {
  positive_interested: "border-emerald-500/40 text-emerald-400",
  positive_soft: "border-emerald-500/40 text-emerald-400",
  positive_referral: "border-emerald-500/40 text-emerald-400",
  neutral_question: "border-blue/40 text-blue",
  negative_hostile: "border-error/50 text-error",
};

/** Replies get slower to convert by the hour; a day-old one is flagged. */
const STALE_MS = 24 * 3_600_000;

export function RepliesTab({ openPerson }: { openPerson: (p: PersonRef) => void }) {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const replies = useQuery(api.emailOps.listReplies, { onlyOpen });
  const logReply = useMutation(api.emailOps.logReply);
  const setHandled = useMutation(api.emailOps.setReplyHandled);

  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("positive_interested");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await logReply({
        email,
        category: category as Parameters<typeof logReply>[0]["category"],
        text: text || undefined,
      });
      setEmail("");
      setText("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-text-muted">
            Answer the interested ones first. A reply left a day loses much of its chance of
            becoming a call.
          </p>
          <div className="flex gap-1" role="group" aria-label="Which replies">
            <Button size="sm" variant={onlyOpen ? "default" : "outline"} aria-pressed={onlyOpen} onClick={() => setOnlyOpen(true)}>
              Waiting
            </Button>
            <Button size="sm" variant={onlyOpen ? "outline" : "default"} aria-pressed={!onlyOpen} onClick={() => setOnlyOpen(false)}>
              All
            </Button>
          </div>
        </div>

        {replies === undefined ? (
          <p className="mt-6 text-sm text-text-muted">Loading…</p>
        ) : replies.length === 0 ? (
          <div className="mt-4">
            <Empty title={onlyOpen ? "No replies waiting on you" : "No replies logged yet"}>
              Replies land in your own inbox. Log each one here so it is counted and nobody is
              left waiting.
            </Empty>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {replies.map((r) => {
              const stale = r.handledAt === null && Date.now() - r.receivedAt > STALE_MS;
              return (
                <li key={r.id} className="rounded-lg border border-border bg-bg-secondary/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={CATEGORY_TINT[r.category] ?? "border-border text-text-muted"}>
                        {REPLY_LABEL[r.category]}
                      </Badge>
                      <span className="text-sm font-medium text-text-primary">{r.email}</span>
                      <span className={stale ? "text-xs text-error" : "text-xs text-text-muted"} title={fmtDateTime(r.receivedAt)}>
                        {ago(r.receivedAt)}
                        {stale && " · overdue"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {r.personId && (
                        <Button size="sm" variant="outline" onClick={() => openPerson({ kind: r.kind, id: r.personId! })}>
                          Open person
                        </Button>
                      )}
                      {r.handledAt === null ? (
                        <>
                          <a
                            href={`mailto:${r.email}`}
                            className="rounded-md border border-border px-3 py-1.5 text-sm text-text-primary hover:border-gold-dim hover:text-gold"
                          >
                            Answer
                          </a>
                          <Button size="sm" onClick={() => void setHandled({ replyId: r.id, handled: true })}>
                            Mark answered
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => void setHandled({ replyId: r.id, handled: false })}>
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                  {r.text && <p className="mt-2 whitespace-pre-wrap text-sm text-text-muted">{r.text}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <form onSubmit={(e) => void submit(e)} className="h-fit rounded-lg border border-border p-4">
        <p className="text-sm font-medium text-text-primary">Log a reply</p>
        <div className="mt-3 space-y-3">
          <Field label="From (email)">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="What kind">
            <NativeSelect label="What kind of reply" value={category} onChange={setCategory} options={REPLY_OPTIONS} className="w-full" />
          </Field>
          <Field label="What they said" hint="Optional.">
            <Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          </Field>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-sm text-error">
            {error}
          </p>
        )}
        <Button type="submit" className="mt-3 w-full" disabled={busy}>
          {busy ? "Logging…" : "Log reply"}
        </Button>
      </form>
    </div>
  );
}
