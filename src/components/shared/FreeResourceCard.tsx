"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Download } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import {
  FileText,
  CalendarClock,
  ClipboardCheck,
  Factory,
  HardDrive,
  CloudUpload,
  Target,
  Compass,
} from "lucide-react";

export type ResourceCategory = "builders" | "founders" | "premium";
export type ResourceDelivery = "download" | "email" | "external" | "paid";

export interface FreeResource {
  icon: LucideIcon;
  toolName: string;
  /** Short curiosity-inducing phrase shown under the name in larger type. */
  tagline: string;
  description: string;
  href: string;
  category: ResourceCategory;
  /** Public GitHub folder for the tool, linked from the gated portal page. */
  repoUrl?: string;
  /** How the user obtains it. Defaults to "email" (lead-gated). */
  delivery?: ResourceDelivery;
  /** Optional inline safety note (e.g. tools that can delete files). */
  disclaimer?: string;
  /** Display price for paid tools, e.g. "$24.99/mo". */
  price?: string;
  /** Who the paid tool is for, e.g. "For everyone", "For builders". */
  audience?: string;
  /** Paid tool not yet available — shows a disabled "Coming soon" CTA. */
  comingSoon?: boolean;
}

export const BUILDER_RESOURCES: FreeResource[] = [
  {
    toolName: "Disk Space Optimizer",
    tagline: "Your Mac is hoarding gigabytes. This reclaims them — safely.",
    description:
      "A safety-gated loop that measures, then proposes cleanups across Docker, Downloads, and caches — archiving to Drive and deleting only what you approve. One real run freed 12 GB.",
    icon: HardDrive,
    href: "/downloads/disk-space-optimizer-skill.zip",
    repoUrl:
      "https://github.com/MatthewKerns/software-development-best-practices-guide/tree/main/skills/disk-space-optimizer",
    category: "builders",
    delivery: "download",
    disclaimer: "Can delete files — read the included disclaimer first.",
  },
  {
    toolName: "Google Drive Archiver",
    tagline: "Move it to the cloud before you delete it.",
    description:
      "Backs up Downloads, screenshots, and recordings to your own Google Drive — and removes the local copy only after the upload is verified. Your keys, your Drive.",
    icon: CloudUpload,
    href: "/downloads/google-drive-archiver-skill.zip",
    repoUrl:
      "https://github.com/MatthewKerns/software-development-best-practices-guide/tree/main/skills/google-drive-archiver",
    category: "builders",
    delivery: "download",
    disclaimer: "Can delete files — read the included disclaimer first.",
  },
  {
    toolName: "Feature Factory + Best Practices",
    tagline: "Ship features like a ten-person engineering team.",
    description:
      "Six Claude Code orchestrator skills (arch, func, errors, observability, review, docs) plus a complete software-engineering reference — foundations to production readiness. Free on GitHub.",
    icon: Factory,
    href: "https://github.com/MatthewKerns/software-development-best-practices-guide",
    repoUrl:
      "https://github.com/MatthewKerns/software-development-best-practices-guide/tree/main/skills/feature-factory",
    category: "builders",
    delivery: "external",
  },
];

/**
 * Founder tools — free, founder-facing workflows kept in this repo (packaged in
 * `skill-packages/` → `public/downloads/`), delivered as direct downloads. Their
 * "special place" is the Founder tools section on the free-tools / portal pages.
 */
export const FOUNDER_RESOURCES: FreeResource[] = [
  {
    toolName: "Quarterly Planner (EOS)",
    tagline: "Plan your next 90 days the way you run on EOS.",
    description:
      "A founder's quarterly planning session. Reads context from your Google Drive, Apple Notes, and Claude history (read-only), then walks the EOS pulse — review last quarter, set 3–7 Rocks, build a weekly Scorecard, and output a 90-day plan + Level 10 agenda.",
    icon: Target,
    href: "/downloads/quarterly-planner-skill.zip",
    category: "founders",
    delivery: "download",
    disclaimer:
      "Reads your Drive / Notes / Claude history (read-only) — see the included disclaimer.",
  },
  {
    toolName: "E-Commerce Brand Business Automation Audit",
    tagline:
      "Find the one constraint holding your brand back — and the ranked plan to fix it.",
    description:
      "A four-stage strategic audit for an e-commerce or Amazon FBA brand — yours or a client's. Five Claude skills run as one pipeline: structured discovery → Theory-of-Constraints diagnosis → a ranked, reasoned opportunity matrix with a Kill List → a time-phased roadmap. Turns a brand's messy reality into a short list of what to actually do next, everything else deferred.",
    icon: Compass,
    href: "/downloads/ecommerce-brand-automation-audit-skill.zip",
    category: "founders",
    delivery: "download",
    disclaimer:
      "Strategic guidance, not financial or legal advice — see the included disclaimer.",
  },
];

/**
 * Paid tools — the heavily-supported, continuously-improved workflows sold on
 * /subscribe. Each targets a different audience. CTA routes to /subscribe.
 */
export const PREMIUM_RESOURCES: FreeResource[] = [
  {
    toolName: "Personal Time Planner",
    tagline: "Plan your day around what actually matters.",
    description:
      "A continuously-supported planning workflow that turns your goals into a realistic daily plan — and keeps you on it.",
    icon: CalendarClock,
    href: "/subscribe",
    category: "premium",
    delivery: "paid",
    price: "$24.99/mo",
    audience: "For everyone",
  },
  {
    toolName: "Side Gig / Contractor Work Time",
    tagline: "Track billable work without the busywork.",
    description:
      "Capture time across clients and projects, see what's billable, and keep contractor delivery on track — built for builders running side gigs.",
    icon: ClipboardCheck,
    href: "/subscribe",
    category: "premium",
    delivery: "paid",
    price: "$24.99/mo",
    audience: "For builders",
  },
  {
    toolName: "Business Management (EOS)",
    tagline: "Run your whole company on one operating system.",
    description:
      "The Entrepreneurial Operating System as a supported workflow — scorecards, rocks, and L10s in one place. For founders running the business.",
    icon: FileText,
    href: "/subscribe",
    category: "premium",
    delivery: "paid",
    price: "$49.99/mo",
    audience: "For founders",
    comingSoon: true,
  },
];

/** Combined list, kept for backward-compatible consumers (e.g. EmailCapture). */
export const FREE_RESOURCES: FreeResource[] = [...BUILDER_RESOURCES];

interface FreeResourceCardProps {
  icon: LucideIcon;
  toolName: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  onCtaClick?: () => void;
  downloaded?: boolean;
  /** Curiosity phrase shown prominently under the name. */
  tagline?: string;
  /** Controls the CTA: direct download, external link, or email-gated (default). */
  delivery?: ResourceDelivery;
  /** Optional inline safety note. */
  disclaimer?: string;
  /** Display price for paid tools, e.g. "$24.99/mo". */
  price?: string;
  /** Who the paid tool is for, e.g. "For everyone". */
  audience?: string;
  /** Paid tool not yet available — shows a disabled "Coming soon" CTA. */
  comingSoon?: boolean;
}

export function FreeResourceCard({
  toolName,
  description,
  icon: Icon,
  ctaLabel,
  ctaHref,
  onCtaClick,
  downloaded = false,
  tagline,
  delivery = "email",
  disclaimer,
  price,
  audience,
  comingSoon = false,
}: FreeResourceCardProps) {
  const track = useTrackEvent();
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-xl border border-border bg-bg-secondary p-5 transition-all",
        "hover:border-gold-dim hover:shadow-[0_0_24px_rgba(212,175,55,0.15)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary">
          <Icon className="h-6 w-6 text-gold" aria-hidden="true" />
        </div>
        <span
          className={cn(
            "rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
            delivery === "paid"
              ? "bg-blue/10 text-blue"
              : "bg-gold/10 text-gold"
          )}
          aria-label={delivery === "paid" ? "Paid tool" : "Free tool"}
        >
          {delivery === "paid" ? (price ?? "Paid") : "Free"}
        </span>
      </div>

      {/* Audience (paid tools) */}
      {audience && (
        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-dim">
          {audience}
        </p>
      )}

      {/* Skill name — larger letters */}
      <h3
        className={cn(
          "text-xl font-bold leading-tight text-text-primary",
          audience ? "mt-1" : "mt-4"
        )}
      >
        {toolName}
      </h3>

      {/* Curiosity-inducing phrase */}
      {tagline && (
        <p className="mt-1.5 text-sm font-medium text-gold-light">{tagline}</p>
      )}

      <p className="mt-2 text-xs leading-relaxed text-text-muted">
        {description}
      </p>

      {disclaimer && (
        <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-warning">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{disclaimer}</span>
        </p>
      )}

      <div className="mt-auto pt-4">
        {delivery === "paid" ? (
          comingSoon ? (
            <span className="inline-flex min-h-[44px] items-center text-sm font-semibold text-text-dim">
              Coming soon
            </span>
          ) : (
            <a
              href={ctaHref}
              className="inline-flex min-h-[44px] items-center text-sm font-semibold text-gold transition-colors hover:text-gold-light"
            >
              {ctaLabel} &rarr;
            </a>
          )
        ) : delivery === "download" ? (
          <a
            href={ctaHref}
            download
            onClick={() =>
              track(ANALYTICS_EVENTS.TOOL_DOWNLOADED, {
                tool: toolName,
                delivery,
                href: ctaHref,
              })
            }
            className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-blue transition-colors hover:text-blue-light"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {ctaLabel}
          </a>
        ) : delivery === "external" ? (
          <a
            href={ctaHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              track(ANALYTICS_EVENTS.TOOL_DOWNLOADED, {
                tool: toolName,
                delivery,
                href: ctaHref,
              })
            }
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-blue transition-colors hover:text-blue-light"
          >
            {ctaLabel} &rarr;
          </a>
        ) : downloaded ? (
          <div className="flex items-center gap-1.5 text-sm text-success">
            <Check className="h-4 w-4" aria-hidden="true" />
            Sent to email
          </div>
        ) : onCtaClick ? (
          <button
            onClick={onCtaClick}
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-blue transition-colors hover:text-blue-light"
          >
            {ctaLabel} →
          </button>
        ) : (
          <a
            href={ctaHref}
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-blue transition-colors hover:text-blue-light"
          >
            {ctaLabel} &rarr;
          </a>
        )}
      </div>
    </div>
  );
}
