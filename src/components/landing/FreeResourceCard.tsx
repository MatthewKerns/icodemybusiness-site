import { cn } from "@/lib/utils";
import { FileText, BarChart3, ClipboardCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FreeResource {
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

export const FREE_RESOURCES: FreeResource[] = [
  {
    name: "EOS System Spreadsheet Skill",
    description:
      "Organize your business with the Entrepreneurial Operating System framework.",
    icon: FileText,
    href: "#",
  },
  {
    name: "Habits Tracker Management Skill",
    description:
      "Build and track productive habits that compound into business growth.",
    icon: BarChart3,
    href: "#",
  },
  {
    name: "Client Delivery / Work Tracking Skill",
    description:
      "Keep projects on track with structured delivery and progress tracking.",
    icon: ClipboardCheck,
    href: "#",
  },
];

interface FreeResourceCardProps {
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
  downloaded?: boolean;
}

export function FreeResourceCard({
  name,
  description,
  icon: Icon,
  href,
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
            <h4 className="text-sm font-medium text-text-primary">{name}</h4>
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
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          Downloaded
        </div>
      ) : (
        <a
          href={href}
          className="mt-3 inline-block text-sm font-medium text-blue transition-colors hover:text-blue-light"
        >
          Get Free →
        </a>
      )}
    </div>
  );
}
