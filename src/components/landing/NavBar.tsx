"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";
import { CreditCard, LogOut, Menu, X } from "lucide-react";
import { ConvexErrorBoundary } from "../shared/ConvexErrorBoundary";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/consulting", label: "Consulting" },
  { href: "/subscribe", label: "Subscriptions" },
  { href: "/free-tools", label: "Free Tools" },
  { href: "/services", label: "Services" },
] as const;

/**
 * Billing button component that uses Convex subscription query.
 * Wrapped with ConvexErrorBoundary to gracefully hide on query errors.
 */
function BillingButtonCore({
  variant = "desktop",
  onMobileBillingClick,
}: {
  variant?: "desktop" | "mobile";
  onMobileBillingClick?: () => void;
}) {
  const { isSignedIn, user } = useUser();

  const subscription = useQuery(
    api.subscriptions.getActiveSubscription,
    isSignedIn && user?.id ? { userId: user.id } : "skip"
  );

  const handleManageBilling = useCallback(async () => {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
  }, []);

  // Only show billing button if user is signed in AND has an active subscription
  if (!isSignedIn || !subscription) {
    return null;
  }

  if (variant === "desktop") {
    return (
      <button
        onClick={() => void handleManageBilling()}
        className="flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm text-text-muted transition-colors hover:border-gold-dim hover:text-gold"
        aria-label="Manage billing"
      >
        <CreditCard className="h-4 w-4" />
        Billing
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        onMobileBillingClick?.();
        void handleManageBilling();
      }}
      className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border text-base font-medium text-text-muted transition-colors hover:text-gold"
    >
      <CreditCard className="h-5 w-5" />
      Manage Billing
    </button>
  );
}

/**
 * Billing button wrapped with ConvexErrorBoundary.
 * Falls back to null (hides billing button) if subscription query fails.
 */
function BillingButton(props: {
  variant?: "desktop" | "mobile";
  onMobileBillingClick?: () => void;
}) {
  return (
    <ConvexErrorBoundary fallback={null}>
      <BillingButtonCore {...props} />
    </ConvexErrorBoundary>
  );
}

export function NavBar() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const isHome = pathname === "/";
  const [visible, setVisible] = useState(!isHome);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Listen for splash visibility events from SplashScreen
  useEffect(() => {
    if (!isHome) {
      setVisible(true);
      return;
    }

    function handleSplashVisibility(e: Event) {
      const { visible: splashVisible } = (e as CustomEvent).detail;
      setVisible(!splashVisible);
    }

    window.addEventListener("splash-visibility", handleSplashVisibility);
    return () =>
      window.removeEventListener("splash-visibility", handleSplashVisibility);
  }, [isHome]);

  // Focus trap + scroll lock for mobile menu
  useEffect(() => {
    if (!mobileOpen) return;

    // Lock body scroll
    document.body.style.overflow = "hidden";

    // Move focus into the menu
    const closeBtn = menuRef.current?.querySelector<HTMLElement>(
      'button[aria-label="Close menu"]'
    );
    closeBtn?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setMobileOpen(false);
        hamburgerRef.current?.focus();
      }

      if (e.key === "Tab" && menuRef.current) {
        const focusable = menuRef.current.querySelectorAll<HTMLElement>(
          'a, button, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    hamburgerRef.current?.focus();
  }, []);

  if (!visible) return null;

  return (
    <>
      <nav
        className="fixed inset-x-0 top-0 z-50 border-b border-border bg-black/90 backdrop-blur-lg"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6 lg:px-12">
          {/* Logo */}
          <Link
            href="/"
            className="font-accent text-lg font-medium text-gold"
          >
            iCodeMyBusiness
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-gold",
                  pathname === href ? "text-gold" : "text-text-muted"
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA + Sign Out */}
          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/consulting#booking"
              className="rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              Book a Call
            </Link>
            <BillingButton variant="desktop" />
            {isSignedIn && (
              <SignOutButton>
                <button
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-text-muted transition-colors hover:text-gold"
                  aria-label="Sign out"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </SignOutButton>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            ref={hamburgerRef}
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-text-primary md:hidden"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </nav>

      {/* Spacer so content isn't hidden behind fixed nav */}
      <div className="h-16" />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          ref={menuRef}
          className="fixed inset-0 z-[60] flex flex-col bg-black md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <div className="flex h-16 items-center justify-between px-4">
            <span className="font-accent text-lg font-medium text-gold">
              iCodeMyBusiness
            </span>
            <button
              onClick={closeMobile}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-text-primary"
              aria-label="Close menu"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-1 px-4 pt-4">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeMobile}
                className={cn(
                  "flex h-12 items-center rounded-lg px-4 text-lg font-medium transition-colors",
                  pathname === href
                    ? "text-gold"
                    : "text-text-primary hover:text-gold"
                )}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="flex flex-col gap-3 p-4">
            <Link
              href="/consulting#booking"
              onClick={closeMobile}
              className="flex h-12 items-center justify-center rounded-lg bg-gold text-base font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              Book a Call
            </Link>
            <BillingButton variant="mobile" onMobileBillingClick={closeMobile} />
            {isSignedIn && (
              <SignOutButton>
                <button
                  className="flex h-12 items-center justify-center gap-2 rounded-lg border border-border text-base font-medium text-text-muted transition-colors hover:text-gold"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </SignOutButton>
            )}
          </div>
        </div>
      )}
    </>
  );
}
