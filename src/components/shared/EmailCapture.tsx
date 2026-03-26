"use client";

import { useState, useRef, useCallback } from "react";
import { useMutation } from "convex/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { parseConvexError } from "@/lib/errors";
import { useSessionId } from "@/hooks/useSessionId";
import { Check, Loader2 } from "lucide-react";
import { FreeResourceCard, FREE_RESOURCES } from "./FreeResourceCard";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { emailSchema } from "@/lib/schemas";

// Form schema for email capture
const emailCaptureSchema = z.object({
  email: emailSchema,
});

type EmailCaptureFormValues = z.infer<typeof emailCaptureSchema>;

type EmailCaptureVariant = "full" | "compact";

interface EmailCaptureProps {
  variant?: EmailCaptureVariant;
  source?: string;
  headline?: string;
  subtitle?: string;
  buttonLabel?: string;
  successMessage?: string;
}

export function EmailCapture({
  variant = "full",
  source,
  headline = "Get free AI tools instantly",
  subtitle = "Enter your email for immediate access. No credit card. No catch.",
  buttonLabel = "Get Free Access",
  successMessage = "You\u2019re in! Explore your free tools below.",
}: EmailCaptureProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");
  const [showGlow, setShowGlow] = useState(false);
  const [serverError, setServerError] = useState("");
  const submittingRef = useRef(false);
  const sessionId = useSessionId();
  const createLead = useMutation(api.leads.createLead);

  const form = useForm<EmailCaptureFormValues>({
    resolver: zodResolver(emailCaptureSchema),
    defaultValues: {
      email: "",
    },
    mode: "onBlur",
  });

  const handleSubmit = useCallback(
    async (values: EmailCaptureFormValues) => {
      if (status === "loading") return;
      if (submittingRef.current) return;

      submittingRef.current = true;
      setStatus("loading");
      setServerError("");

      try {
        await createLead({
          email: values.email,
          source,
          sessionId: sessionId ?? undefined,
        });

        setStatus("success");
        setShowGlow(true);
        setTimeout(() => setShowGlow(false), 1500);
      } catch (err: unknown) {
        setServerError(parseConvexError(err));
        setStatus("idle");
      } finally {
        submittingRef.current = false;
      }
    },
    [source, sessionId, createLead, status]
  );

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
            {successMessage}
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FREE_RESOURCES.map((resource) => (
            <FreeResourceCard
              key={resource.toolName}
              icon={resource.icon}
              toolName={resource.toolName}
              description={resource.description}
              downloaded
              ctaLabel="Access Now"
              ctaHref={resource.href}
            />
          ))}
        </div>
      </div>
    );
  }

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

      <Form {...form}>
        <form
          onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
          aria-label="Email signup"
          className={cn(
            variant === "compact"
              ? "flex flex-col gap-2 sm:flex-row"
              : "flex flex-col gap-3"
          )}
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="relative flex-1">
                <label htmlFor="email-capture-input" className="sr-only">
                  Email address
                </label>
                <FormControl>
                  <input
                    {...field}
                    id="email-capture-input"
                    type="email"
                    placeholder="you@example.com"
                    className="h-12 w-full rounded-lg border border-border bg-bg-tertiary px-4 text-base text-text-primary placeholder:text-text-dim transition-colors focus:outline-none focus:ring-2 focus:ring-blue-light aria-[invalid=true]:border-error"
                    disabled={status === "loading"}
                  />
                </FormControl>
                <FormMessage className="mt-1 text-sm" />
                {serverError && (
                  <p className="mt-1 text-sm text-error">{serverError}</p>
                )}
              </FormItem>
            )}
          />

          <button
            type="submit"
            disabled={status === "loading"}
            className={buttonClasses}
          >
            {status === "loading" ? (
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            ) : (
              buttonLabel
            )}
          </button>
        </form>
      </Form>
    </div>
  );
}
