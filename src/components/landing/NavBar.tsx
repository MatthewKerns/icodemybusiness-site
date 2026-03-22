"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/consulting", label: "Consulting" },
  { href: "/subscribe", label: "Subscriptions" },
  { href: "/free-tools", label: "Free Tools" },
  { href: "/services", label: "Services" },
] as const;

export function NavBar() {
  const pathname = usePathname();
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

          {/* Desktop CTA */}
          <Link
            href="/consulting#booking"
            className="hidden rounded-lg bg-gold px-5 py-2.5 text-sm font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] md:inline-block"
          >
            Book a Call
          </Link>

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

          <div className="p-4">
            <Link
              href="/consulting#booking"
              onClick={closeMobile}
              className="flex h-12 items-center justify-center rounded-lg bg-gold text-base font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              Book a Call
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
