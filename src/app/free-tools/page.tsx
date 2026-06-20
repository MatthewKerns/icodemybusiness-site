"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useSessionId } from "@/hooks/useSessionId";
import { useLeadAccess } from "@/hooks/useLeadAccess";
import {
  FreeResourceCard,
  BUILDER_RESOURCES,
  FOUNDER_RESOURCES,
  type FreeResource,
} from "@/components/shared/FreeResourceCard";
import { Check, Mail, Wrench, Rocket, ShieldAlert } from "lucide-react";

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

        {/* Builders */}
        <section className="mt-16" aria-labelledby="builders-heading">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue/10">
              <Wrench className="h-5 w-5 text-blue" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="builders-heading"
                className="text-h3 font-bold text-text-primary"
              >
                Builders
              </h2>
              <p className="text-sm text-text-muted">
                Skills for the people shipping the software.
              </p>
            </div>
          </div>

          {/* Disclaimer — these tools can run real commands and delete files */}
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
            <ShieldAlert
              className="mt-0.5 h-5 w-5 shrink-0 text-warning"
              aria-hidden="true"
            />
            <p className="text-xs leading-relaxed text-text-muted">
              <span className="font-semibold text-text-primary">
                Use at your own risk.
              </span>{" "}
              The Builder tools run real commands on your machine and can
              permanently delete files and Docker resources. Each download
              ships with a full disclaimer — always run a{" "}
              <code className="rounded bg-bg-tertiary px-1 py-0.5 text-gold">
                --dry-run
              </code>{" "}
              first and keep your own backups. Provided &ldquo;as is&rdquo;
              without warranty; iCodeMyBusiness is not liable for any data loss.
            </p>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BUILDER_RESOURCES.map((resource) => (
              <FreeResourceCard
                key={resource.toolName}
                icon={resource.icon}
                toolName={resource.toolName}
                tagline={resource.tagline}
                description={resource.description}
                delivery={resource.delivery}
                disclaimer={resource.disclaimer}
                ctaLabel={ctaLabelFor(resource)}
                ctaHref={ctaHrefFor(resource)}
                downloaded={resource.delivery === "email" ? hasAccess : false}
                onCtaClick={
                  resource.delivery === "email" && !isAuthenticated
                    ? handleGetAccess
                    : undefined
                }
              />
            ))}
          </div>
        </section>

        {/* Founders */}
        <section className="mt-16" aria-labelledby="founders-heading">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10">
              <Rocket className="h-5 w-5 text-gold" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="founders-heading"
                className="text-h3 font-bold text-text-primary"
              >
                Founders
              </h2>
              <p className="text-sm text-text-muted">
                Skills for running and growing the business.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FOUNDER_RESOURCES.map((resource) => (
              <FreeResourceCard
                key={resource.toolName}
                icon={resource.icon}
                toolName={resource.toolName}
                tagline={resource.tagline}
                description={resource.description}
                delivery={resource.delivery}
                ctaLabel={ctaLabelFor(resource)}
                ctaHref={ctaHrefFor(resource)}
                downloaded={resource.delivery === "email" ? hasAccess : false}
                onCtaClick={
                  resource.delivery === "email" && !isAuthenticated
                    ? handleGetAccess
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );

  function ctaLabelFor(resource: FreeResource): string {
    if (resource.delivery === "download") return "Download";
    if (resource.delivery === "external") return "View on GitHub";
    return hasAccess ? "Check Email" : "Get Free";
  }

  function ctaHrefFor(resource: FreeResource): string {
    if (resource.delivery === "email") return hasAccess ? resource.href : "#";
    return resource.href;
  }
}
