"use client";

import { useEffect, useState } from "react";
import {
  FreeResourceCard,
  BUILDER_RESOURCES,
  FOUNDER_RESOURCES,
  type FreeResource,
  type ResourceDelivery,
} from "@/components/shared/FreeResourceCard";
import { EmailCapture } from "@/components/shared/EmailCapture";
import { analytics } from "@/lib/analytics";
import Link from "next/link";
import { Wrench, ShieldAlert, Rocket, Plug, ArrowRight } from "lucide-react";

/** Browser-only marker that this visitor already left an email. */
const UNLOCK_KEY = "icmb.freeToolsUnlocked";

export default function FreeResourcesPage() {
  const [hasAccess, setHasAccess] = useState(false);

  // The unlock lives in the browser so a return visit (for example from the
  // welcome email) keeps the links open. It is a soft gate: the links are
  // public once known, and the server never enforces it.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(UNLOCK_KEY) === "1") setHasAccess(true);
    } catch {
      // storage unavailable (private mode, blocked): stay locked
    }
  }, []);

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
            Open dev skills and our GitHub best-practices repo — yours to use
            today. No credit card. No catch.
          </p>
        </section>

        {/* Connect in Claude — add the tools as Claude connectors */}
        <section className="mt-12" aria-labelledby="connect-heading">
          <div className="rounded-xl border border-gold-dim bg-gold/5 p-6 md:p-8">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                <Plug className="h-5 w-5 text-gold" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="connect-heading"
                  className="text-h3 font-bold text-text-primary"
                >
                  Use them right inside Claude
                </h2>
                <p className="mt-1 text-sm text-text-muted">
                  Add our tools to Claude as connectors — they show up in any
                  chat. Most tools are free, no account to start.
                </p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/connect/mango"
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-gold px-5 text-sm font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
              >
                Add Mango
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/connect/builder-tools"
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border px-5 text-sm font-medium text-text-primary transition-colors hover:border-gold-dim hover:text-gold"
              >
                Install Software Builder Tools
              </Link>
              <Link
                href="/connect"
                className="flex h-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-text-muted transition-colors hover:text-gold"
              >
                See all connectors
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>

        {/* Email capture — puts the visitor on the list, emails the download links */}
        <section id="get-access" className="mt-12 scroll-mt-24">
          <EmailCapture
            source="free-tools"
            headline="Get the download links by email"
            subtitle="Enter your email and we'll send every free tool straight to your inbox — no account required."
            buttonLabel="Send Me the Tools"
            successMessage="Check your email — we've sent your download links."
            onSuccess={(email) => {
              setHasAccess(true);
              try {
                window.localStorage.setItem(UNLOCK_KEY, "1");
              } catch {
                // storage unavailable: the links still arrive by email
              }
              analytics.freeToolAccessed({ source: "free-tools" });
              void fetch("/api/email/welcome", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              });
            }}
          />
        </section>

        {/* Free tools — the GitHub best-practices repo + dev skills */}
        <section className="mt-16" aria-labelledby="free-heading">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue/10">
              <Wrench className="h-5 w-5 text-blue" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="free-heading"
                className="text-h3 font-bold text-text-primary"
              >
                Free tools
              </h2>
              <p className="text-sm text-text-muted">
                Open dev skills from our GitHub best-practices repo — free to
                download or grab on GitHub.
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
                delivery={deliveryFor(resource)}
                disclaimer={resource.disclaimer}
                ctaLabel={ctaLabelFor(resource)}
                ctaHref={ctaHrefFor(resource)}
              />
            ))}
          </div>
        </section>

        {/* Founder tools — free, founder-facing workflows kept in this repo */}
        <section className="mt-16" aria-labelledby="founder-heading">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10">
              <Rocket className="h-5 w-5 text-gold" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="founder-heading"
                className="text-h3 font-bold text-text-primary"
              >
                Founder tools
              </h2>
              <p className="text-sm text-text-muted">
                Free workflows for running the business — yours to download and
                drop into Claude Code.
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
                delivery={deliveryFor(resource)}
                disclaimer={resource.disclaimer}
                ctaLabel={ctaLabelFor(resource)}
                ctaHref={ctaHrefFor(resource)}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );

  /** Free tools stay locked until the visitor leaves an email; paid cards are untouched. */
  function isLocked(resource: FreeResource): boolean {
    return resource.delivery !== "paid" && !hasAccess;
  }

  function deliveryFor(resource: FreeResource): ResourceDelivery {
    return isLocked(resource) ? "email" : (resource.delivery ?? "email");
  }

  function ctaLabelFor(resource: FreeResource): string {
    if (isLocked(resource)) return "Send me the link";
    if (resource.delivery === "download") return "Download";
    if (resource.delivery === "external") return "View on GitHub";
    if (resource.delivery === "paid") return "View plans";
    return "Open";
  }

  function ctaHrefFor(resource: FreeResource): string {
    return isLocked(resource) ? "#get-access" : resource.href;
  }
}
