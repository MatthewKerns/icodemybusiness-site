"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Download } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";
import type { ResourceDelivery } from "@/lib/free-resources";

export type {
  FreeResource,
  ResourceCategory,
  ResourceDelivery,
} from "@/lib/free-resources";
export {
  BUILDER_RESOURCES,
  FOUNDER_RESOURCES,
  FREE_RESOURCES,
} from "@/lib/free-resources";

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
