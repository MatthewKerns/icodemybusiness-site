"use client";

import { useState, useRef, useId } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";
import { FreeResourceCard, FREE_RESOURCES } from "./FreeResourceCard";

type EmailCaptureVariant = "full" | "compact";

interface EmailCaptureProps {
  variant?: EmailCaptureVariant;
  source?: string;
  headline?: string;
  subtitle?: string;
}

export function EmailCapture({
  variant = "full",
  source,
  headline = "Get free AI tools instantly",
  subtitle = "Enter your email for immediate access. No credit card. No catch.",
}: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [showGlow, setShowGlow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const errorId = useId();
  const createLead = useMutation(api.leads.createLead);

  function validate(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  function handleBlur() {
    if (email && !validate(email)) {
      setError("Enter a valid email address");
    }
  }

  function handleChange(value: string) {
    setEmail(value);
    if (error) setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate(email)) {
      setError("Enter a valid email address");
      inputRef.current?.focus();
      return;
    }

    setStatus("loading");
    setError("");

    try {
      let sessionId: string | undefined;
      if (typeof window !== "undefined") {
        sessionId = localStorage.getItem("icmb_session_id") ?? undefined;
        if (!sessionId) {
          sessionId = crypto.randomUUID();
          localStorage.setItem("icmb_session_id", sessionId);
        }
      }

      await createLead({ email, source, sessionId });
      setStatus("success");
      setShowGlow(true);
      setTimeout(() => setShowGlow(false), 1500);
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("idle");
    }
  }

  if (status === "success") {
    return (
      <div
        className={cn(
          "rounded-xl border border-border bg-bg-secondary p-6 transition-shadow duration-500",
          showGlow && "shadow-[0_0_30px_rgba(212,175,55,0.2)]"
        )}
      >
        <div
          className="flex items-center gap-3"
          role="status"
          aria-live="polite"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/20">
            <Check className="h-5 w-5 text-success" />
          </div>
          <p className="font-medium text-text-primary">
            Check your email!
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FREE_RESOURCES.map((resource) => (
            <FreeResourceCard key={resource.name} {...resource} />
          ))}
        </div>
      </div>
    );
  }

  const inputClasses = cn(
    "h-12 w-full rounded-lg border bg-bg-tertiary px-4 text-base text-text-primary placeholder:text-text-dim transition-colors focus:outline-none focus:ring-2 focus:ring-blue-light",
    error ? "border-error" : "border-border"
  );

  const buttonClasses =
    "h-12 shrink-0 rounded-lg bg-gold px-6 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] disabled:opacity-60";

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-6">
      {variant === "full" && (
        <div className="mb-4">
          <h3 className="text-h3 font-bold text-text-primary">{headline}</h3>
          <p className="mt-1 text-sm text-text-muted">{subtitle}</p>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        aria-label="Email signup"
        className={cn(
          variant === "compact"
            ? "flex flex-col gap-2 sm:flex-row"
            : "flex flex-col gap-3"
        )}
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="email"
            required
            value={email}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="you@example.com"
            className={inputClasses}
            aria-describedby={error ? errorId : undefined}
            aria-invalid={!!error}
          />
          {error && (
            <p id={errorId} className="mt-1 text-sm text-error">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={status === "loading"}
          className={buttonClasses}
        >
          {status === "loading" ? (
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          ) : (
            "Get Free Access"
          )}
        </button>
      </form>
    </div>
  );
}
