import { SplashScreen } from "@/components/landing/SplashScreen";
import { VslSection } from "@/components/landing/letter/VslSection";
import { AssessmentGate } from "@/components/landing/AssessmentGate";
import { SalesLetter } from "@/components/landing/letter/SalesLetter";
import { SocialProofBar } from "@/components/landing/SocialProofBar";
import { CommunityBanner } from "@/components/landing/CommunityBanner";
import dynamic from "next/dynamic";

const Top3IssuesAgent = dynamic(
  () =>
    import("@/components/agent/top3issues/Top3IssuesAgent").then(
      (m) => m.Top3IssuesAgent
    ),
  { ssr: false }
);

/**
 * The homepage is one continuous sales letter, read top to bottom:
 *
 *   splash → promise + VSL → one action (assess) → the assessment itself
 *   → problem → who I am → which path is you → objections → guarantee → close
 *
 * A CTA to the intro call recurs after each major beat rather than waiting for
 * the end. No prices appear anywhere; the tier is signalled through scope and
 * commitment instead (docs/ROADMAP.md R-009). Copy lives in
 * src/content/landing.ts so rewording it isn't a component edit.
 */
export default function Home() {
  return (
    <>
      <SplashScreen />
      <main
        id="main-content"
        className="min-h-screen bg-bg-primary px-4 md:px-6 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <VslSection />

          {/*
            One action, not a menu. A visitor who has just clicked in is looking
            for the next thing to click, so give them exactly one — and make it
            the assessment rather than a pitch.
          */}
          <AssessmentGate />

          {/* The assessment itself, directly beneath the door that opens it. */}
          <section id="top3" className="scroll-mt-24 py-12 lg:py-20">
            <div className="mx-auto max-w-5xl">
              <Top3IssuesAgent />
            </div>
          </section>

          <SalesLetter />

          {/* Credibility metrics */}
          <SocialProofBar />

          {/* Community */}
          <CommunityBanner />
        </div>
      </main>
    </>
  );
}
