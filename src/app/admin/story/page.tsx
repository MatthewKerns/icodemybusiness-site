"use client";

/**
 * The story vault.
 *
 * A box to drop a fragment into, a coverage map of which questions it answers,
 * and the pile itself. Deliberately not a form: story material arrives in
 * pieces while you are doing something else, and a 42-question form is the
 * wrong container for that.
 *
 * Nothing here ever rewrites what was typed. Routing is a proposal you can
 * correct; the words stay yours.
 */

import { useMemo, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  STORY_QUESTIONS,
  STORY_GROUP_LABELS,
  getStoryQuestion,
  type StoryGroup,
} from "@/content/story-questions";

const GROUP_ORDER: StoryGroup[] = ["A", "B", "X", "R"];

export default function StoryVaultPage() {
  const fragments = useQuery(api.storyFragments.list, {});
  const coverage = useQuery(api.storyFragments.coverage, {});
  const add = useMutation(api.storyFragments.add);
  const setRouting = useMutation(api.storyFragments.setRouting);
  const archive = useMutation(api.storyFragments.archive);

  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Id<"storyFragments"> | null>(null);
  const [openGroup, setOpenGroup] = useState<StoryGroup | null>("A");

  const byQuestion = useMemo(() => {
    const map: Record<string, typeof fragments> = {};
    for (const f of fragments ?? []) {
      for (const qid of f.questionIds) {
        (map[qid] ??= []).push(f);
      }
    }
    return map;
  }, [fragments]);

  /** Run a write and surface its failure instead of dropping it. */
  async function guard(fn: () => Promise<unknown>) {
    try {
      await fn();
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "That didn't save — try again."
      );
    }
  }

  async function submit() {
    const text = draft.trim();
    if (!text || saving) return;
    setSaving(true);
    setError(null);
    try {
      await add({ text });
      setDraft("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save that — try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const blockingPct = coverage
    ? Math.round((coverage.blockingCovered / coverage.blockingTotal) * 100)
    : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-white">Story</h1>
        <p className="mt-2 max-w-2xl text-sm text-neutral-400">
          Drop anything in — a memory, a number, a phrase you liked, something
          that annoyed you. It gets filed against the questions it answers.
          Nothing you write here is ever rewritten.
        </p>
      </header>

      {/* ---- the dump box ------------------------------------------------ */}
      <section className="mb-10">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void submit();
          }}
          rows={5}
          placeholder="What happened, what it cost, what you thought at the time…"
          className="min-h-[120px] bg-neutral-950 text-base"
          aria-label="New story fragment"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={() => void submit()} disabled={!draft.trim() || saving}>
            {saving ? "Saving…" : "Save fragment"}
          </Button>
          <span className="text-xs text-neutral-500">⌘/Ctrl + Enter</span>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      </section>

      {/* ---- coverage ---------------------------------------------------- */}
      <section className="mb-10">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-xl text-white">Coverage</h2>
          {coverage && (
            <span className="text-sm text-neutral-400">
              <span className="font-semibold text-[#D4AF37]">
                {coverage.blockingCovered}/{coverage.blockingTotal}
              </span>{" "}
              questions blocking emails 1–4
              {coverage.unrouted > 0 && (
                <> · {coverage.unrouted} fragment(s) filed nowhere</>
              )}
            </span>
          )}
        </div>

        <div className="mb-5 h-1 w-full overflow-hidden rounded bg-neutral-800">
          <div
            className="h-full bg-[#D4AF37] transition-all"
            style={{ width: `${blockingPct}%` }}
          />
        </div>

        <div className="space-y-2">
          {GROUP_ORDER.map((g) => {
            const rows =
              coverage?.rows.filter((r) => r.group === g) ??
              STORY_QUESTIONS.filter((q) => q.group === g).map((q) => ({
                ...q,
                fragmentCount: 0,
              }));
            const covered = rows.filter((r) => r.fragmentCount > 0).length;
            const open = openGroup === g;
            return (
              <div
                key={g}
                className="rounded-lg border border-neutral-800 bg-neutral-950"
              >
                <button
                  type="button"
                  onClick={() => setOpenGroup(open ? null : g)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  aria-expanded={open}
                >
                  <span className="font-medium text-white">
                    {STORY_GROUP_LABELS[g]}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {covered}/{rows.length} answered
                  </span>
                </button>
                {open && (
                  <ul className="space-y-1 px-4 pb-4">
                    {rows.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-start gap-3 border-t border-neutral-900 py-2 text-sm"
                      >
                        <span className="mt-0.5 w-8 shrink-0 font-mono text-xs text-[#D4AF37]">
                          {r.id}
                        </span>
                        <span
                          className={
                            r.fragmentCount > 0
                              ? "flex-1 text-neutral-300"
                              : "flex-1 text-neutral-500"
                          }
                        >
                          {r.question}
                        </span>
                        <span className="shrink-0 text-xs">
                          {r.fragmentCount > 0 ? (
                            <Badge variant="secondary">
                              {r.fragmentCount}
                            </Badge>
                          ) : "blocking" in r && r.blocking ? (
                            <span className="text-orange-400">needed</span>
                          ) : (
                            <span className="text-neutral-600">—</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- the pile ---------------------------------------------------- */}
      <section>
        <h2 className="mb-3 font-display text-xl text-white">
          Fragments{fragments ? ` (${fragments.length})` : ""}
        </h2>
        {error && (
          <p className="mb-3 text-xs text-red-400" role="alert">
            {error}
          </p>
        )}

        {fragments === undefined && (
          <p className="text-sm text-neutral-500">Loading…</p>
        )}
        {fragments && fragments.length === 0 && (
          <p className="text-sm text-neutral-500">
            Nothing yet. The box above is the whole interface.
          </p>
        )}

        <div className="space-y-3">
          {(fragments ?? []).map((f) => (
            <article
              key={f._id}
              className="rounded-lg border border-neutral-800 bg-neutral-950 p-4"
            >
              <p className="whitespace-pre-wrap text-sm text-neutral-200">
                {f.text}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {f.routingPending && (
                  <span className="text-xs text-neutral-500">filing…</span>
                )}
                {f.routingError && (
                  <span className="text-xs text-orange-400">
                    {f.routingError}
                  </span>
                )}
                {f.questionIds.map((qid) => (
                  <Badge key={qid} variant="outline" title={getStoryQuestion(qid)?.question ?? qid}>
                    {qid}
                  </Badge>
                ))}
                {!f.routingPending &&
                  f.questionIds.length === 0 &&
                  !f.routingError && (
                    <span className="text-xs text-neutral-500">
                      filed nowhere
                    </span>
                  )}
                {f.routingSource === "manual" && (
                  <span className="text-xs text-neutral-600">by hand</span>
                )}

                <span className="ml-auto flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEditing(editing === f._id ? null : f._id)
                    }
                  >
                    {editing === f._id ? "Done" : "Re-file"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void guard(() => archive({ fragmentId: f._id }))}
                  >
                    Archive
                  </Button>
                </span>
              </div>

              {editing === f._id && (
                <div className="mt-3 flex flex-wrap gap-1 border-t border-neutral-900 pt-3">
                  {STORY_QUESTIONS.map((q) => {
                    const on = f.questionIds.includes(q.id);
                    return (
                      <button
                        key={q.id}
                        type="button"
                        title={q.question}
                        onClick={() =>
                          void guard(() =>
                            setRouting({
                              fragmentId: f._id,
                              questionIds: on
                                ? f.questionIds.filter((x) => x !== q.id)
                                : [...f.questionIds, q.id],
                            })
                          )
                        }
                        className={
                          on
                            ? "rounded border border-[#D4AF37] bg-[#D4AF37]/15 px-2 py-1 font-mono text-xs text-[#D4AF37]"
                            : "rounded border border-neutral-800 px-2 py-1 font-mono text-xs text-neutral-500 hover:border-neutral-600"
                        }
                      >
                        {q.id}
                      </button>
                    );
                  })}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* ---- per-question view ------------------------------------------- */}
      {Object.keys(byQuestion).length > 0 && (
        <section className="mt-12">
          <h2 className="mb-3 font-display text-xl text-white">
            By question
          </h2>
          <div className="space-y-4">
            {STORY_QUESTIONS.filter((q) => (byQuestion[q.id] ?? []).length > 0).map(
              (q) => (
                <div
                  key={q.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-950 p-4"
                >
                  <p className="mb-2 text-sm font-medium text-white">
                    <span className="mr-2 font-mono text-xs text-[#D4AF37]">
                      {q.id}
                    </span>
                    {q.question}
                  </p>
                  <ul className="space-y-2">
                    {(byQuestion[q.id] ?? []).map((f) => (
                      <li
                        key={f._id}
                        className="border-l-2 border-neutral-800 pl-3 text-sm whitespace-pre-wrap text-neutral-300"
                      >
                        {f.text}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}
