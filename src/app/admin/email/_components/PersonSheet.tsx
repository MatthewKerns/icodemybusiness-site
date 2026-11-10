"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  NativeSelect,
  REPLY_LABEL,
  STAGES,
  STAGE_LABEL,
  errorText,
  fmtDate,
  fmtDateTime,
  type Stage,
} from "./shared";

export interface PersonRef {
  kind: "lead" | "prospect";
  id: string;
}

const STAGE_OPTIONS = STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s] }));
const REPLY_OPTIONS = Object.entries(REPLY_LABEL).map(([value, label]) => ({ value, label }));

const KIND_TINT: Record<string, string> = {
  reply: "bg-gold",
  send: "bg-blue",
  callback: "bg-emerald-400",
  suppression: "bg-error",
  note: "bg-text-muted",
};

/** One person: who they are, what to do next, and everything that has happened. */
export function PersonSheet({ person, onClose }: { person: PersonRef | null; onClose: () => void }) {
  const data = useQuery(api.emailOps.getPerson, person ?? "skip");
  const setStage = useMutation(api.emailOps.setStage);
  const addNote = useMutation(api.emailOps.addNote);
  const logReply = useMutation(api.emailOps.logReply);
  const setSuppressed = useMutation(api.emailOps.setSuppressed);
  const setReplyHandled = useMutation(api.emailOps.setReplyHandled);
  const setEnrollmentStatus = useMutation(api.emailOps.setEnrollmentStatus);

  const [note, setNote] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyCategory, setReplyCategory] = useState("positive_interested");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setNote("");
    setReplyText("");
    setReplyCategory("positive_interested");
    setError(null);
  }, [person?.id]);

  /** Fire-and-report: handlers call this and return nothing. */
  const run = (fn: () => Promise<unknown>): void => {
    setBusy(true);
    setError(null);
    fn()
      .catch((err: unknown) => setError(errorText(err)))
      .finally(() => setBusy(false));
  };

  return (
    <Sheet open={person !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto border-border bg-bg-primary sm:max-w-xl">
        {person && data === undefined && (
          <SheetHeader>
            <SheetTitle className="text-text-primary">Loading…</SheetTitle>
            <SheetDescription>Fetching this person&apos;s record.</SheetDescription>
          </SheetHeader>
        )}
        {person && data === null && (
          <SheetHeader>
            <SheetTitle className="text-text-primary">Not found</SheetTitle>
            <SheetDescription>This record no longer exists.</SheetDescription>
          </SheetHeader>
        )}
        {person && data && (
          <>
            <SheetHeader>
              <SheetTitle className="text-text-primary">{data.name ?? data.email}</SheetTitle>
              <SheetDescription>
                {data.name ? `${data.email} · ` : ""}
                {[data.title, data.company].filter(Boolean).join(", ")}
                {data.title || data.company ? " · " : ""}
                {data.kind === "lead" ? "Site lead" : "Cold prospect"} from {data.origin}, added{" "}
                {fmtDate(data.createdAt)}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-3 flex flex-wrap gap-1">
              {data.suppressed && (
                <Badge variant="outline" className="border-error/50 text-error">
                  do not email
                </Badge>
              )}
              {data.kind === "lead" && (
                <Badge variant="outline" className="border-border text-text-muted">
                  {data.consentedAt ? `opted in ${fmtDate(data.consentedAt)}` : "no marketing opt-in"}
                </Badge>
              )}
              {data.website && (
                <a href={data.website.startsWith("http") ? data.website : `https://${data.website}`} target="_blank" rel="noreferrer" className="text-xs text-text-muted hover:text-gold">
                  {data.website}
                </a>
              )}
              {data.linkedinUrl && (
                <a href={data.linkedinUrl} target="_blank" rel="noreferrer" className="text-xs text-text-muted hover:text-gold">
                  LinkedIn
                </a>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-3 text-sm text-error">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-text-muted">Stage</span>
              <NativeSelect
                label="Stage"
                value={data.stage}
                onChange={(next) =>
                  run(() => setStage({ kind: person.kind, id: person.id, stage: next as Stage }))
                }
                options={STAGE_OPTIONS}
              />
              <a
                href={`mailto:${data.email}`}
                className="rounded-md border border-border px-3 py-1.5 text-sm text-text-primary hover:border-gold-dim hover:text-gold"
              >
                Write to them
              </a>
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => run(() => setSuppressed({ email: data.email, suppressed: !data.suppressed }))}
              >
                {data.suppressed ? "Allow email again" : "Stop all email"}
              </Button>
            </div>

            {data.openReplies.length > 0 && (
              <div className="mt-5 rounded-md border border-gold-dim bg-gold/5 p-3">
                <p className="text-sm font-medium text-text-primary">Waiting on your answer</p>
                <ul className="mt-2 space-y-2">
                  {data.openReplies.map((r) => (
                    <li key={r.id} className="flex items-center justify-between gap-2 text-sm text-text-muted">
                      <span>
                        {REPLY_LABEL[r.category]} · {fmtDateTime(r.receivedAt)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => run(() => setReplyHandled({ replyId: r.id, handled: true }))}
                      >
                        Mark answered
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.enrollments.some((e) => e.status !== "exited") && (
              <div className="mt-5">
                <p className="text-xs uppercase tracking-wide text-text-muted">Sequences</p>
                <ul className="mt-2 space-y-2">
                  {data.enrollments
                    .filter((e) => e.status !== "exited")
                    .map((e) => (
                      <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-text-primary">
                          {e.label}
                          <span className="ml-2 text-xs text-text-muted">
                            {e.status} · {e.lastStepSent} sent · next {fmtDate(e.nextDueAt)}
                          </span>
                        </span>
                        <span className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                              run(() =>
                                setEnrollmentStatus({
                                  enrollmentId: e.id,
                                  status: e.status === "active" ? "paused" : "active",
                                })
                              )
                            }
                          >
                            {e.status === "active" ? "Pause" : "Resume"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busy}
                            onClick={() => run(() => setEnrollmentStatus({ enrollmentId: e.id, status: "exited" }))}
                          >
                            End
                          </Button>
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  await logReply({
                    email: data.email,
                    category: replyCategory as Parameters<typeof logReply>[0]["category"],
                    text: replyText || undefined,
                  });
                  setReplyText("");
                });
              }}
            >
              <p className="text-xs uppercase tracking-wide text-text-muted">Log a reply</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <NativeSelect
                  label="What kind of reply"
                  value={replyCategory}
                  onChange={setReplyCategory}
                  options={REPLY_OPTIONS}
                />
                <Button type="submit" size="sm" disabled={busy}>
                  Log reply
                </Button>
              </div>
              <Textarea
                aria-label="What they said"
                placeholder="What they said (optional)"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                className="mt-2"
              />
              <p className="mt-1 text-xs text-text-dim">
                Logging a reply moves the stage for you. Unsubscribe, hostile and bounce also stop
                email to this address.
              </p>
            </form>

            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                run(async () => {
                  await addNote({ kind: person.kind, id: person.id, text: note });
                  setNote("");
                });
              }}
            >
              <p className="text-xs uppercase tracking-wide text-text-muted">Add a note</p>
              <Textarea
                aria-label="Note"
                placeholder="Anything worth remembering next time"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="mt-2"
              />
              <Button type="submit" size="sm" className="mt-2" disabled={busy || !note.trim()}>
                Save note
              </Button>
            </form>

            <p className="mt-8 text-xs uppercase tracking-wide text-text-muted">History</p>
            <ol className="mt-3 space-y-3">
              {data.timeline.map((item, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_TINT[item.kind] ?? "bg-border"}`}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span className="text-text-primary">{item.title}</span>
                    <span className="ml-2 text-xs text-text-dim">{fmtDateTime(item.at)}</span>
                    {item.detail && (
                      <span className="block whitespace-pre-wrap break-words text-text-muted">
                        {item.detail}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
