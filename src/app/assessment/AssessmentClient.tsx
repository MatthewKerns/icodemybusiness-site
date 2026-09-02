"use client";

import dynamic from "next/dynamic";

/**
 * Client-only mount of the assessment for the /assessment route, so the page
 * itself can stay a Server Component with metadata. Same shape as the letter's
 * DiscoveryAssessmentLazy; `source` differs so analytics can tell the two
 * entry points apart. The dynamic import also keeps the page clear of the
 * ESLint phase rule on static `@/components/agent/*` imports.
 */
const DiscoveryAssessment = dynamic(
  () =>
    import("@/components/agent/discovery/DiscoveryAssessment").then(
      (m) => m.DiscoveryAssessment
    ),
  { ssr: false }
);

export function AssessmentClient() {
  return <DiscoveryAssessment source="assessment-page" />;
}
