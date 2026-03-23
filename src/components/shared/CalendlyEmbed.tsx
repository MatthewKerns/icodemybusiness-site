"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface CalendlyEmbedProps {
  url: string;
  email?: string;
  name?: string;
}

const LOAD_TIMEOUT_MS = 15_000;
const CALENDLY_MIN_HEIGHT = 660;

function buildCalendlyUrl(base: string, email?: string, name?: string): string {
  const url = new URL(base);
  url.searchParams.set("hide_event_type_details", "1");
  url.searchParams.set("hide_gdpr_banner", "1");
  url.searchParams.set("background_color", "000000");
  url.searchParams.set("text_color", "e6ecf1");
  url.searchParams.set("primary_color", "d4af37");
  if (email) url.searchParams.set("email", email);
  if (name) url.searchParams.set("name", name);
  return url.toString();
}

export function CalendlyEmbed({ url, email, name }: CalendlyEmbedProps) {
  const [state, setState] = useState<"pending" | "loading" | "loaded" | "error">("pending");
  const containerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInView = useCallback(() => {
    setState("loading");
    timeoutRef.current = setTimeout(() => {
      setState((prev) => (prev === "loading" ? "error" : prev));
    }, LOAD_TIMEOUT_MS);
  }, []);

  // IntersectionObserver — start loading when scrolled into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el || state !== "pending") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          handleInView();
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [state, handleInView]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleIframeLoad = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState("loaded");
  }, []);

  const iframeSrc = buildCalendlyUrl(url, email, name);

  if (state === "error") {
    return (
      <div
        ref={containerRef}
        className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border border-border bg-bg-secondary p-8 text-center"
      >
        <p className="text-sm text-text-secondary">
          The booking calendar couldn&apos;t load. You can still schedule directly:
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-gold px-6 py-3 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          Book directly on Calendly &rarr;
        </a>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Skeleton placeholder */}
      {state !== "loaded" && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-xl border border-border bg-bg-secondary",
            "animate-pulse bg-gold-dim/10"
          )}
          aria-hidden="true"
        >
          <span className="text-sm text-text-secondary/60">
            Loading booking calendar&hellip;
          </span>
        </div>
      )}

      {/* Iframe — rendered once loading begins */}
      {(state === "loading" || state === "loaded") && (
        <iframe
          src={iframeSrc}
          title="Book a consultation"
          className={cn(
            "relative w-full rounded-xl border-0 transition-opacity duration-300",
            state === "loaded" ? "opacity-100" : "opacity-0"
          )}
          style={{ minHeight: CALENDLY_MIN_HEIGHT }}
          onLoad={handleIframeLoad}
          loading="lazy"
        />
      )}

      {/* Placeholder with hint text when waiting for scroll */}
      {state === "pending" && (
        <div
          className="flex items-center justify-center text-sm text-text-secondary/60"
          style={{ height: CALENDLY_MIN_HEIGHT }}
        >
          Loading booking calendar&hellip;
        </div>
      )}
    </div>
  );
}
