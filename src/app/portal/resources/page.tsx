"use client";

import Link from "next/link";
import {
  FreeResourceCard,
  BUILDER_RESOURCES,
  FOUNDER_RESOURCES,
} from "@/components/shared/FreeResourceCard";
import { Wrench, ShieldAlert, Rocket, Sparkles, ArrowRight } from "lucide-react";

/**
 * Resources page — lives inside the gated client portal (auth enforced by
 * `src/app/portal/layout.tsx`). Holds everything: free dev tools (GitHub),
 * free founder tools (download), the paid Advanced workflows, and the
 * "Custom E-Commerce Tools Set" application (neither free nor paid — apply).
 * The public `/free-tools` page drives sign-ups; tools are delivered here.
 */
export default function PortalResourcesPage() {
  return (
    <div className="min-h-screen bg-bg-primary px-4 py-8 md:px-8 lg:px-12">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header>
          <h1 className="text-h2 font-bold text-text-primary">Resources</h1>
          <p className="mt-1 text-sm text-text-muted">
            Free tools, founder workflows, and custom builds — everything
            available to you in one place.
          </p>
        </header>

        {/* Custom E-Commerce Tools Set — the application offering (apply) */}
        <section className="mt-8" aria-labelledby="custom-heading">
          <div className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 to-transparent p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gold/15">
                <Sparkles className="h-6 w-6 text-gold" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="custom-heading"
                    className="text-xl font-bold text-text-primary"
                  >
                    Custom E-Commerce Tools Set
                  </h2>
                  <span className="rounded bg-gold/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-gold">
                    Apply
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm text-text-muted">
                  A bespoke set of AI automations built for your store. Have a
                  quick, free chat about where you&apos;re losing time — we scope
                  and build your tools in the background, then email you the
                  opportunities. No commitment to start.
                </p>
                <Link
                  href="/custom-tools"
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-gold px-4 py-2 text-sm font-semibold text-bg-primary transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                >
                  Start your application
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Free tools — each links to its public GitHub repo folder */}
        <section className="mt-12" aria-labelledby="free-heading">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue/10">
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
                Open dev skills from our GitHub best-practices repo — read the
                overview, then grab each one on GitHub.
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
              permanently delete files and Docker resources. Each repo includes a
              full disclaimer — always run a{" "}
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
                delivery="external"
                disclaimer={resource.disclaimer}
                ctaLabel="View on GitHub"
                ctaHref={resource.repoUrl ?? resource.href}
              />
            ))}
          </div>
        </section>

        {/* Founder tools — free, founder-facing workflows (direct downloads) */}
        <section className="mt-12" aria-labelledby="founder-heading">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gold/10">
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
                Free workflows for running the business — download and drop into
                Claude Code.
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
                disclaimer={resource.disclaimer}
                ctaLabel="Download"
                ctaHref={resource.href}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
