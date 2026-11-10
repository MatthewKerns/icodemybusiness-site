"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Grouped by what the owner is doing, not by when each page was built. */
const ADMIN_GROUPS = [
  {
    label: "Growth",
    links: [
      { href: "/admin/email", label: "Email" },
      { href: "/admin/funnel", label: "Funnel" },
      { href: "/admin/assessments", label: "Assessments" },
      { href: "/admin/applications", label: "Applications" },
      { href: "/admin/conversations", label: "Conversations" },
      { href: "/admin/events", label: "Events" },
    ],
  },
  {
    label: "Work",
    links: [
      { href: "/admin/objectives", label: "Objectives" },
      { href: "/admin/objectives/requests", label: "Requests" },
      { href: "/admin/projects", label: "Projects" },
    ],
  },
  {
    label: "Content",
    links: [
      { href: "/admin/story", label: "Story" },
      { href: "/admin/x", label: "X Posts" },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-bg-primary">
      <nav
        aria-label="Admin sections"
        className="sticky top-0 z-30 border-b border-border bg-bg-primary/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-3 md:px-6 lg:px-12">
          {ADMIN_GROUPS.map((group, i) => (
            <div
              key={group.label}
              role="group"
              aria-label={group.label}
              className={cn("flex items-center gap-1", i > 0 && "ml-2 border-l border-border pl-3")}
            >
              <span className="mr-1 whitespace-nowrap text-xs uppercase tracking-wide text-text-dim">
                {group.label}
              </span>
              {group.links.map((link) => {
                const active =
                  link.href === "/admin/objectives"
                    ? pathname === link.href
                    : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "bg-bg-secondary text-gold"
                        : "text-text-muted hover:bg-bg-secondary/60 hover:text-text-primary",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
