"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { FileText, BarChart3, ClipboardCheck } from "lucide-react";

export interface FreeResource {
  icon: LucideIcon;
  toolName: string;
  description: string;
  href: string;
}

export const FREE_RESOURCES: FreeResource[] = [
  {
    toolName: "EOS System Spreadsheet Skill",
    description:
      "Organize your business with the Entrepreneurial Operating System framework.",
    icon: FileText,
    href: "#eos-spreadsheet",
  },
  {
    toolName: "Habits Tracker Management Skill",
    description:
      "Build and track productive habits that compound into business growth.",
    icon: BarChart3,
    href: "#habits-tracker",
  },
  {
    toolName: "Client Delivery / Work Tracking Skill",
    description:
      "Keep projects on track with structured delivery and progress tracking.",
    icon: ClipboardCheck,
    href: "#client-delivery",
  },
];

interface FreeResourceCardProps {
  icon: LucideIcon;
  toolName: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  onCtaClick?: () => void;
  downloaded?: boolean;
}

export function FreeResourceCard({
  toolName,
  description,
  icon: Icon,
  ctaLabel,
  ctaHref,
  onCtaClick,
  downloaded = false,
}: FreeResourceCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-bg-secondary p-4 transition-all hover:border-gold-dim hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary">
          <Icon className="h-5 w-5 text-gold" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-text-primary">
              {toolName}
            </h4>
            <span
              className="rounded bg-gold/10 px-1.5 py-0.5 text-xs font-medium text-gold"
              aria-label="Free tool"
            >
              Free
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">{description}</p>
        </div>
      </div>

      {downloaded ? (
        <div className="mt-3 flex items-center gap-1.5 text-sm text-success">
          <Check className="h-4 w-4" aria-hidden="true" />
          Sent to email
        </div>
      ) : onCtaClick ? (
        <button
          onClick={onCtaClick}
          className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-blue transition-colors hover:text-blue-light"
        >
          {ctaLabel} →
        </button>
      ) : (
        <a
          href={ctaHref}
          className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-blue transition-colors hover:text-blue-light"
        >
          {ctaLabel} &rarr;
        </a>
      )}
    </div>
  );
}
