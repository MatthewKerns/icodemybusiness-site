"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSessionId } from "@/hooks/useSessionId";
import { useLeadAccess } from "@/hooks/useLeadAccess";
import {
  FreeResourceCard,
  FREE_RESOURCES,
} from "@/components/shared/FreeResourceCard";
import { Check, Mail } from "lucide-react";

export default function FreeResourcesPage() {
  const { user, isSignedIn, isLoaded: clerkLoaded } = useUser();
  const { status: leadStatus } = useLeadAccess();
  const sessionId = useSessionId();
  const createLead = useMutation(api.leads.createLead);
  const processingRef = useRef(false);
  const emailSentRef = useRef(false);

  // After sign-in, auto-create lead + send welcome email (runs once)
  useEffect(() => {
    if (!isSignedIn || !user) return;
    if (leadStatus !== "no-access") return;
    if (processingRef.current || emailSentRef.current) return;

    processingRef.current = true;
    const email = user.primaryEmailAddress?.emailAddress ?? "";
    const name = user.fullName ?? undefined;

    createLead({
      email,
      name,
      source: "free-tools",
      sessionId: sessionId ?? undefined,
      clerkUserId: user.id,
    })
      .then(() => {
        if (emailSentRef.current) return;
        emailSentRef.current = true;

        return fetch("/api/email/welcome", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name }),
        });
      })
      .catch(() => {
        // Lead may already exist or email failed — non-critical
      })
      .finally(() => {
        processingRef.current = false;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, leadStatus]);

  const handleGetAccess = () => {
    if (isSignedIn) return; // already signed in, lead creation handled by effect
    // Redirect to Clerk sign-in, then back to this page
    window.location.href = `/sign-in?redirect_url=${encodeURIComponent("/free-tools")}`;
  };

  // Loading state
  if (!clerkLoaded || leadStatus === "loading") {
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

  const hasAccess = leadStatus === "has-access";
  const isAuthenticated = !!isSignedIn;

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

        {/* Sign-in CTA for unauthenticated users */}
        {!isAuthenticated && (
          <section className="mt-12" aria-live="polite">
            <div className="rounded-xl border border-border bg-bg-secondary p-6">
              <div className="mb-4">
                <h3 className="text-h3 font-bold text-text-primary">
                  Sign in to get instant access to all free tools.
                </h3>
                <p className="mt-1 text-sm text-text-muted">
                  We&apos;ll send you the download links right away.
                </p>
              </div>
              <button
                onClick={handleGetAccess}
                className="h-12 shrink-0 rounded-lg bg-gold px-6 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
              >
                Get Free Access
              </button>
            </div>
          </section>
        )}

        {/* Check your email confirmation */}
        {isAuthenticated && hasAccess && (
          <section className="mt-12" aria-live="polite">
            <div className="rounded-xl border border-border bg-bg-secondary p-6">
              <div className="flex items-center gap-3" role="status">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/20">
                  <Check className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-text-primary">
                    Check your email!
                  </p>
                  <p className="text-sm text-text-muted">
                    We&apos;ve sent download links for all free tools to{" "}
                    <span className="font-medium text-text-primary">
                      {user?.primaryEmailAddress?.emailAddress}
                    </span>
                    . Check your spam folder if you don&apos;t see it.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Authenticated but lead still being created */}
        {isAuthenticated && !hasAccess && (
          <section className="mt-12" aria-live="polite">
            <div className="rounded-xl border border-border bg-bg-secondary p-6">
              <div className="flex items-center gap-3" role="status">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20">
                  <Mail className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="font-medium text-text-primary">
                    Setting up your access...
                  </p>
                  <p className="text-sm text-text-muted">
                    We&apos;re preparing your free tools and sending them to your email.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Resource Cards */}
        <section className="mt-12" aria-live="polite">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FREE_RESOURCES.map((resource) => (
              <FreeResourceCard
                key={resource.toolName}
                icon={resource.icon}
                toolName={resource.toolName}
                description={resource.description}
                downloaded={hasAccess}
                ctaLabel={hasAccess ? "Check Email" : "Get Free"}
                ctaHref={hasAccess ? resource.href : "#"}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
