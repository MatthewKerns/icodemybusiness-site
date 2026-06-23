"use client";

import { cn } from "@/lib/utils";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";

/**
 * The Free / Advanced plan CTA on /mango. A small client component so the plan
 * the visitor chose is captured durably (the page itself is a server component).
 */
export function MangoPlanCta({
  plan,
  label,
  href,
  highlighted,
}: {
  plan: string;
  label: string;
  href: string;
  highlighted: boolean;
}) {
  const track = useTrackEvent();
  return (
    <a
      href={href}
      onClick={() =>
        track(ANALYTICS_EVENTS.PLAN_SELECTED, { plan, surface: "mango" }, "decision")
      }
      className={cn(
        "mt-6 flex h-12 items-center justify-center rounded-lg px-6 font-medium transition-shadow",
        highlighted
          ? "bg-gold text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
          : "border border-border text-text-primary transition-colors hover:border-gold-dim hover:text-gold"
      )}
    >
      {label}
    </a>
  );
}
