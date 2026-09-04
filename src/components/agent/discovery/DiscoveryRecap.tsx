"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Check, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RECAP_CONFIRM,
  RECAP_INTRO,
  recapRows,
  type DiscoveryAnswers,
} from "@/content/discovery-questions";

/**
 * Stage 5: play the five answers back in the visitor's words and ask.
 *
 * "Yes" moves to the email step (skipped when signed in, since Clerk already
 * knows the address). "Not quite" opens a correction box; the correction is
 * one model turn (or a verbatim note when the model is unavailable).
 */
export function DiscoveryRecap({
  answers,
  correction,
  busy,
  onCorrect,
  onAccepted,
  onCorrectionOpened,
  onSubmit,
}: {
  answers: DiscoveryAnswers;
  correction?: string;
  busy: boolean;
  onCorrect: (text: string) => void;
  /**
   * "Yes, that's right" was clicked. `needsEmail` says whether the visitor is
   * about to meet the email form or goes straight through, which is the whole
   * point of the event: the drop happens in that form.
   */
  onAccepted?: (needsEmail: boolean) => void;
  /**
   * The visitor opened the correction box. Analytics live in the container,
   * not here: useTrackEvent pulls in useAuth, usePathname and useMutation, and
   * every render test of this component would then need all three mocked.
   */
  onCorrectionOpened?: () => void;
  onSubmit: (email: string, name?: string) => Promise<void>;
}) {
  const { user, isSignedIn, isLoaded } = useUser();
  const [phase, setPhase] = useState<"ask" | "correct" | "email">("ask");
  const [correctionText, setCorrectionText] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clerkEmail = user?.primaryEmailAddress?.emailAddress;

  const confirm = async () => {
    const straightThrough = Boolean(isLoaded && isSignedIn && clerkEmail);
    onAccepted?.(!straightThrough);
    if (straightThrough) {
      await submit(clerkEmail!, user?.fullName ?? undefined);
      return;
    }
    setPhase("email");
  };

  const submit = async (e: string, n?: string) => {
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(e.trim(), n?.trim() || undefined);
    } catch (err) {
      setError(
        err instanceof Error && /valid email/i.test(err.message)
          ? "That email address doesn't look right."
          : "Couldn't save that. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border-gold bg-bg-secondary p-6">
      <p className="font-accent text-xs uppercase tracking-wider text-gold">
        The recap
      </p>
      <p className="mt-3 text-base leading-relaxed text-text-muted">
        {RECAP_INTRO}
      </p>
      {/*
        One row per question, never a spliced sentence. Same shape as
        DiscoverySummaryCard, so the recap reads as a draft of the write-up
        they are about to receive.
      */}
      <dl className="mt-5 space-y-5">
        {recapRows(answers).map((row) => (
          <div key={row.key}>
            <dt className="font-accent text-xs uppercase tracking-wider text-text-dim">
              {row.label}
            </dt>
            <dd className="mt-1 text-base leading-relaxed text-text-primary">
              {row.text}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-base leading-relaxed text-text-primary">
        {RECAP_CONFIRM}
      </p>
      {correction && (
        <p className="mt-3 rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-muted">
          Your note: <span className="text-text-primary">{correction}</span>
        </p>
      )}

      {phase === "ask" && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={busy || submitting || !isLoaded}
            className={cn(
              "inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-black",
              "transition-colors duration-300 hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light"
            )}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            Yes, that&apos;s right
          </button>
          <button
            type="button"
            onClick={() => {
              onCorrectionOpened?.();
              setPhase("correct");
            }}
            disabled={busy || submitting}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border border-border px-5 py-2.5 text-sm font-medium text-text-primary",
              "transition-colors duration-300 hover:border-gold-dim disabled:opacity-60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light"
            )}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Not quite
          </button>
        </div>
      )}

      {phase === "correct" && (
        <div className="mt-5 flex flex-col gap-3">
          <label htmlFor="discovery-correction" className="text-sm text-text-muted">
            What did I get wrong?
          </label>
          <textarea
            id="discovery-correction"
            value={correctionText}
            onChange={(e) => setCorrectionText(e.target.value)}
            rows={3}
            placeholder="The cost is closer to two days a week, not one…"
            className="resize-none rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:border-gold/60 focus:outline-none"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                const text = correctionText.trim();
                if (!text) return;
                onCorrect(text);
                setCorrectionText("");
                setPhase("ask");
              }}
              disabled={busy || !correctionText.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gold-light disabled:opacity-60"
            >
              Update the recap
            </button>
            <button
              type="button"
              onClick={() => setPhase("ask")}
              className="rounded-md px-3 py-2 text-sm text-text-dim underline-offset-4 hover:text-text-muted hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === "email" && (
        <form
          className="mt-5 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            void submit(email, name);
          }}
        >
          <p className="text-sm text-text-muted">
            Where should I send the write-up? You get it whether or not we
            ever work together.
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            autoComplete="name"
            className="rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:border-gold/60 focus:outline-none"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            className="rounded-md border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:border-gold/60 focus:outline-none"
          />
          {error && <p className="text-xs text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !email.trim()}
            className="inline-flex w-fit items-center gap-2 rounded-md bg-gold px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-gold-light disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            Send me the write-up
          </button>
        </form>
      )}
    </div>
  );
}
