"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, BookmarkCheck, LogIn, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import { useLetterSurface } from "@/components/landing/letter/LetterSurface";

/**
 * The single next action after the splash.
 *
 * The homepage used to hand visitors a wall of choices right after they entered.
 * This gives them exactly one: assess where you are now. The account step in
 * between is deliberately *optional* — it exists to make the report retrievable
 * later, not to gate it. A visitor who declines still gets the full assessment
 * and still gets it emailed; they just can't come back to it in the portal.
 *
 * The copy promises exactly what is implemented and no more. A completed report
 * is claimed to the account and readable at /portal/assessments. Resuming an
 * *unfinished* assessment only works in the same browser session — agentSessions
 * carries no Clerk id — so this must not say "pick up where you left off", which
 * it did until the gap was found. Widen the promise only when that is backed.
 */

const ASSESSMENT_ANCHOR = "#top3";

/** Where Clerk should return the visitor once they finish authenticating. */
function assessmentReturnUrl(): string {
  if (typeof window === "undefined") return `/${ASSESSMENT_ANCHOR}`;
  return `${window.location.origin}/${ASSESSMENT_ANCHOR}`;
}

export function AssessmentGate() {
  const [gateOpen, setGateOpen] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();
  const track = useTrackEvent();
  const surface = useLetterSurface();
  const prefersReducedMotion = useReducedMotion();

  const scrollToAssessment = useCallback(() => {
    document.getElementById("top3")?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [prefersReducedMotion]);

  const startAssessment = useCallback(() => {
    track(
      ANALYTICS_EVENTS.ASSESSMENT_STARTED,
      {
        already_signed_in: Boolean(isSignedIn),
        ...(surface ? { surface } : {}),
      },
      "click"
    );

    // Someone already signed in has nothing to decide — their report will save
    // either way, so skip the gate entirely rather than asking a dead question.
    if (isSignedIn) {
      scrollToAssessment();
      return;
    }
    setGateOpen(true);
  }, [isSignedIn, scrollToAssessment, track, surface]);

  const chooseGuest = useCallback(() => {
    track(
      ANALYTICS_EVENTS.ASSESSMENT_ACCOUNT_CHOICE,
      { choice: "guest" },
      "decision"
    );
    scrollToAssessment();
  }, [scrollToAssessment, track]);

  const chooseAuth = useCallback(
    (choice: "create_account" | "sign_in") => {
      track(
        ANALYTICS_EVENTS.ASSESSMENT_ACCOUNT_CHOICE,
        { choice },
        "decision"
      );
    },
    [track]
  );

  return (
    <section className="py-16 text-center md:py-24">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-h1 font-display font-semibold text-text-primary">
          Let&apos;s start with where you actually are
        </h2>
        {!gateOpen && (
          <button
            type="button"
            onClick={startAssessment}
            disabled={!isLoaded}
            className={cn(
              "group mt-10 inline-flex items-center gap-2.5 rounded-md bg-gold px-8 py-4",
              "text-base font-semibold tracking-wide text-black",
              "transition-all duration-300 hover:bg-gold-light",
              "hover:shadow-[0_0_34px_-6px_rgba(212,175,55,0.55)]",
              "motion-safe:hover:-translate-y-px",
              "disabled:cursor-not-allowed disabled:opacity-60",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light",
              "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
            )}
          >
            Assess where you are now
            <ArrowRight
              className="h-4 w-4 transition-transform duration-300 motion-safe:group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>
        )}

        <AnimatePresence>
          {gateOpen && (
            <motion.div
              initial={
                prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }
              }
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.35 }}
              className={cn(
                "mx-auto mt-10 max-w-md rounded-xl border border-border-gold",
                "bg-bg-secondary p-7 text-left"
              )}
            >
              <div className="flex items-start gap-3">
                <BookmarkCheck
                  className="mt-0.5 h-5 w-5 flex-none text-gold"
                  aria-hidden="true"
                />
                <div>
                  <h3 className="text-h3 font-semibold text-text-primary">
                    Want your report saved?
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    With an account, your finished report is saved to it — so you
                    can come back and read it any time, and we both start from
                    the same page on our call.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <a
                  href={`/sign-up?redirect_url=${encodeURIComponent(assessmentReturnUrl())}`}
                  onClick={() => chooseAuth("create_account")}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-md bg-gold px-6 py-3",
                    "text-sm font-semibold text-black transition-colors duration-300",
                    "hover:bg-gold-light focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-blue-light focus-visible:ring-offset-2",
                    "focus-visible:ring-offset-bg-secondary"
                  )}
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Create a free account
                </a>

                <a
                  href={`/sign-in?redirect_url=${encodeURIComponent(assessmentReturnUrl())}`}
                  onClick={() => chooseAuth("sign_in")}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-md border border-border",
                    "px-6 py-3 text-sm font-medium text-text-primary",
                    "transition-colors duration-300 hover:border-gold-dim",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light",
                    "focus-visible:ring-offset-2 focus-visible:ring-offset-bg-secondary"
                  )}
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  I already have an account
                </a>

                <button
                  type="button"
                  onClick={chooseGuest}
                  className={cn(
                    "mt-1 inline-flex items-center justify-center gap-1.5 rounded-md py-2",
                    "text-sm text-text-dim underline-offset-4",
                    "transition-colors duration-300 hover:text-text-muted hover:underline",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light"
                  )}
                >
                  Continue without an account
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
