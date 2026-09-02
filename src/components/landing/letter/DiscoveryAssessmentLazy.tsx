"use client";

import dynamic from "next/dynamic";

/**
 * The assessment, client-only.
 *
 * This wrapper exists so the `ssr: false` call lives in a Client Component.
 * Calling `dynamic(..., { ssr: false })` from a Server Component is legal on
 * Next 14 but is an error on Next 15 — the indirection removes that upgrade
 * landmine at the cost of one small file.
 *
 * `source="homepage"` distinguishes this from the same component rendered at
 * /assessment, which shares the visitor's session.
 */
const DiscoveryAssessment = dynamic(
  () =>
    import("@/components/agent/discovery/DiscoveryAssessment").then(
      (m) => m.DiscoveryAssessment
    ),
  { ssr: false }
);

export function DiscoveryAssessmentLazy() {
  return <DiscoveryAssessment source="homepage" />;
}
