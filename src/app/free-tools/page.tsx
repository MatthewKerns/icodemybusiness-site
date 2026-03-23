"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSessionId } from "@/hooks/useSessionId";
import { EmailCapture } from "@/components/shared/EmailCapture";
import {
  FreeResourceCard,
  FREE_RESOURCES,
} from "@/components/shared/FreeResourceCard";

export default function FreeResourcesPage() {
  const sessionId = useSessionId();

  const lead = useQuery(
    api.leads.getLeadBySessionId,
    sessionId ? { sessionId } : "skip"
  );

  const isLoading = lead === undefined;
  const hasAccess = lead !== null && lead !== undefined;

  if (isLoading) {
    return (
      <main
        id="main-content"
        className="min-h-screen bg-bg-primary px-4 py-12 md:px-6 lg:px-12"
      >
        <div className="mx-auto max-w-5xl py-12 lg:py-20">
          <section className="text-center">
            <div className="mx-auto h-10 w-3/4 animate-pulse rounded-lg bg-bg-tertiary" />
            <div className="mx-auto mt-4 h-6 w-1/2 animate-pulse rounded-lg bg-bg-tertiary" />
          </section>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-48 animate-pulse rounded-xl border border-border bg-bg-secondary"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="min-h-screen bg-bg-primary px-4 py-12 md:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-5xl py-12 lg:py-20">
        {/* Hero */}
        <section className="text-center">
          <h1 className="text-h1 font-bold text-text-primary">
            Free AI tools that actually work.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-text-muted">
            Claude Project Packs and skills you can use today. No credit card.
            No catch.
          </p>
        </section>

        {/* Email Capture */}
        {!hasAccess && (
          <section className="mt-12" aria-live="polite">
            <EmailCapture
              variant="full"
              source="free-tools"
              headline="Enter your email to get instant access to all free tools."
              subtitle="We will send you the download links right away."
            />
          </section>
        )}

        {/* Resource Cards */}
        <section className="mt-12" aria-live="polite">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FREE_RESOURCES.map((resource) => (
              <FreeResourceCard
                key={resource.toolName}
                {...resource}
                downloaded={hasAccess}
                ctaLabel={hasAccess ? "Access Now" : "Get Free"}
                ctaHref={hasAccess ? resource.ctaHref : "#email-capture"}
              />
            ))}
          </div>
        </section>

        {/* Bottom CTA for returning users */}
        {hasAccess && (
          <section className="mt-12 text-center" aria-live="polite">
            <p className="text-sm text-text-muted">
              Welcome back! You have full access to all free tools.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
