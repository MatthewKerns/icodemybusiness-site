"use client";

import dynamic from "next/dynamic";

/**
 * The assessment, client-only.
 *
 * This wrapper exists so the `ssr: false` call lives in a Client Component.
 * Calling `dynamic(..., { ssr: false })` from a Server Component is legal on
 * Next 14 but is an error on Next 15 — the indirection removes that upgrade
 * landmine at the cost of one small file.
 */
export const Top3IssuesAgentLazy = dynamic(
  () =>
    import("@/components/agent/top3issues/Top3IssuesAgent").then(
      (m) => m.Top3IssuesAgent
    ),
  { ssr: false }
);
