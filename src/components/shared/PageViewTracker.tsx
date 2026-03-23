"use client";

import { useTrackPageView } from "@/hooks/useTrackPageView";

export function PageViewTracker() {
  useTrackPageView();
  return null;
}
