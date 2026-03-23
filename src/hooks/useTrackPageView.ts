"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../convex/_generated/api";
import { useAttribution } from "./useAttribution";

export function useTrackPageView(): void {
  const pathname = usePathname();
  const trackPageView = useMutation(api.pageViews.trackPageView);
  const { userId } = useAuth();
  const { source, variant } = useAttribution();
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (pathname === lastTrackedPath.current) return;
    lastTrackedPath.current = pathname;

    trackPageView({
      page: pathname,
      userId: userId ?? undefined,
      referrer: (typeof document !== "undefined" ? document.referrer : "") || undefined,
      source: source ?? undefined,
      variant: variant ?? undefined,
      timestamp: Date.now(),
    }).catch(console.error);
  }, [pathname, trackPageView, userId, source, variant]);
}
