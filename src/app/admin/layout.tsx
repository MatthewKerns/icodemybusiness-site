"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ADMIN_LINKS = [
  { href: "/admin/objectives", label: "Objectives" },
  { href: "/admin/objectives/requests", label: "Requests" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/assessments", label: "Assessments" },
  { href: "/admin/conversations", label: "Conversations" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/funnel", label: "Funnel" },
  { href: "/admin/x", label: "X Posts" },
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
          {ADMIN_LINKS.map((link) => {
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
      </nav>
      {children}
    </div>
  );
}
