import type { Metadata } from "next";
import { DiscoveryAssessment } from "@/components/agent/discovery/DiscoveryAssessment";

export const metadata: Metadata = {
  title: "Discovery Assessment | iCodeMyBusiness",
  description:
    "Five questions, a few minutes. Find the thing costing your business the most time and money right now, and get the write-up whether or not we ever work together.",
  openGraph: {
    title: "Discovery Assessment | iCodeMyBusiness",
    description:
      "Five questions, a few minutes. Find the thing costing your business the most time and money right now, and get the write-up whether or not we ever work together.",
    type: "website",
  },
};

/**
 * The same assessment that sits at /#top3, on its own URL so it can be linked
 * from emails and ads. The session is shared with the homepage embed.
 */
export default function AssessmentPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-bg-primary px-4 md:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-5xl py-12 lg:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="font-accent text-xs uppercase tracking-wider text-gold">
            Discovery assessment
          </p>
          <h1 className="mt-3 font-display text-h1 font-semibold text-text-primary">
            Let&apos;s start with where you actually are
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-text-muted">
            Before we talk about what to build, we find the thing costing you
            the most time and money right now. Five questions, in your own
            words. You leave with the write-up whether or not we ever work
            together.
          </p>
        </div>
        <DiscoveryAssessment source="assessment-page" />
      </div>
    </main>
  );
}
