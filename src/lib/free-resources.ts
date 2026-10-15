/**
 * The free-tool lineup shown on /free-tools, /portal/resources and in the
 * welcome email. Plain data (no "use client") so server code — the email
 * render in /api/email/welcome — can import it too.
 */
import type { LucideIcon } from "lucide-react";
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
    href: "https://github.com/MatthewKerns/software-development-best-practices-guide/tree/main/skills/disk-space-optimizer",
    repoUrl:
      "https://github.com/MatthewKerns/software-development-best-practices-guide/tree/main/skills/disk-space-optimizer",
    category: "builders",
    delivery: "external",
    disclaimer: "Can delete files — read the included disclaimer first.",
  },
  {
    toolName: "Google Drive Archiver",
    tagline: "Move it to the cloud before you delete it.",
    description:
      "Backs up Downloads, screenshots, and recordings to your own Google Drive — and removes the local copy only after the upload is verified. Your keys, your Drive.",
    icon: CloudUpload,
    href: "https://github.com/MatthewKerns/software-development-best-practices-guide/tree/main/skills/google-drive-archiver",
    repoUrl:
      "https://github.com/MatthewKerns/software-development-best-practices-guide/tree/main/skills/google-drive-archiver",
    category: "builders",
    delivery: "external",
    disclaimer: "Can delete files — read the included disclaimer first.",
  },
  {
    toolName: "Feature Factory + Best Practices",
    tagline: "Ship features like a ten-person engineering team.",
    description:
      "Six Claude Code orchestrator skills (arch, func, errors, observability, review, docs) plus a complete software-engineering reference — foundations to production readiness. Free on GitHub.",
    icon: Factory,
    href: "https://github.com/MatthewKerns/software-development-best-practices-guide/tree/main/skills/feature-factory",
    repoUrl:
      "https://github.com/MatthewKerns/software-development-best-practices-guide/tree/main/skills/feature-factory",
    category: "builders",
    delivery: "external",
  },
];

/**
 * Founder tools — free, founder-facing workflows. Source lives in
 * `skill-packages/` and is published on GitHub; the cards link there. This site
 * deliberately does NOT serve the archives itself: a domain distributing shell
 * and Python scripts reads to ISP malware engines as unwanted-software
 * distribution (see docs/trust-pages.md). Their "special place" is the Founder
 * tools section on the free-tools / portal pages.
 */
export const FOUNDER_RESOURCES: FreeResource[] = [
  {
    toolName: "Quarterly Planner (EOS)",
    tagline: "Plan your next 90 days the way you run on EOS.",
    description:
      "A founder's quarterly planning session. Reads context from your Google Drive, Apple Notes, and Claude history (read-only), then walks the EOS pulse — review last quarter, set 3–7 Rocks, build a weekly Scorecard, and output a 90-day plan + Level 10 agenda.",
    icon: Target,
    href: "https://github.com/MatthewKerns/software-development-best-practices-guide/tree/main/skills/quarterly-planner",
    repoUrl:
      "https://github.com/MatthewKerns/software-development-best-practices-guide/tree/main/skills/quarterly-planner",
    category: "founders",
    delivery: "external",
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
    href: "https://github.com/MatthewKerns/software-development-best-practices-guide/tree/main/skills/ecommerce-brand-automation-audit",
    repoUrl:
      "https://github.com/MatthewKerns/software-development-best-practices-guide/tree/main/skills/ecommerce-brand-automation-audit",
    category: "founders",
    delivery: "external",
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
