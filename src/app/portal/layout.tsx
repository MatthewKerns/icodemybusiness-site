"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { Home, FolderKanban, FileText, Activity, LogOut } from "lucide-react";

const PORTAL_LINKS = [
  { href: "/portal", label: "Dashboard", icon: Home },
  { href: "/portal/projects", label: "Projects", icon: FolderKanban },
  { href: "/portal/deliverables", label: "Deliverables", icon: FileText },
  { href: "/portal/activity", label: "Activity", icon: Activity },
] as const;

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in?redirect_url=/portal");
    }
  }, [isLoaded, isSignedIn, router]);

  // Show loading state while checking auth
  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar Navigation */}
      <aside className="hidden w-64 border-r border-border bg-black/50 lg:block">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link
            href="/portal"
            className="font-accent text-lg font-medium text-gold"
          >
            Client Portal
          </Link>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {PORTAL_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-gold/10 text-gold"
                  : "text-text-muted hover:bg-border/50 hover:text-text-primary"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 border-t border-border p-4">
          <SignOutButton>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-border/50 hover:text-text-primary">
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-black/50 px-4 lg:hidden">
          <Link
            href="/portal"
            className="font-accent text-lg font-medium text-gold"
          >
            Client Portal
          </Link>
          <SignOutButton>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-gold"
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </SignOutButton>
        </header>

        {/* Mobile Navigation */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-black/50 px-2 py-2 lg:hidden">
          {PORTAL_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                pathname === href
                  ? "bg-gold/10 text-gold"
                  : "text-text-muted hover:bg-border/50 hover:text-text-primary"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Page Content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
