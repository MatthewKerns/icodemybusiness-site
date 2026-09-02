import { SplashScreen } from "@/components/landing/SplashScreen";
import { AssessmentGate } from "@/components/landing/AssessmentGate";
import { StoryBlock } from "@/components/landing/StoryBlock";
import { OfferGrid } from "@/components/landing/OfferGrid";
import { SocialProofBar } from "@/components/landing/SocialProofBar";
import { CommunityBanner } from "@/components/landing/CommunityBanner";
// eslint-disable-next-line no-restricted-imports -- voice agent is now live on the homepage (Epic 7 in progress)
import { AgentSection } from "@/components/agent/AgentSection";
import { AgentWorkflowsBlock } from "@/components/landing/AgentWorkflowsBlock";
import dynamic from "next/dynamic";

const Top3IssuesAgent = dynamic(
  () =>
    import("@/components/agent/top3issues/Top3IssuesAgent").then(
      (m) => m.Top3IssuesAgent
    ),
  { ssr: false }
);

export default function Home() {
  return (
    <>
      <SplashScreen />
      <main
        id="main-content"
        className="min-h-screen bg-bg-primary px-4 py-12 md:px-6 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          {/*
            One action, not a menu. A visitor who just clicked into the site is
            looking for the next thing to click — so give them exactly one, and
            make it the assessment rather than a pitch.
          */}
          <AssessmentGate />

          {/* The assessment itself, directly beneath the door that opens it. */}
          <section id="top3" className="scroll-mt-24 py-12 lg:py-20">
            <div className="mx-auto max-w-5xl">
              <Top3IssuesAgent />
            </div>
          </section>

          <section className="lg:hidden">
            <StoryBlock
              number="01"
              heading="Save time with AI"
              body="Stop spending hours on repetitive tasks. AI automation handles the busywork so you can focus on growing your business."
              accentWord="AI"
            />
            <StoryBlock
              number="02"
              heading="Make money doing what matters"
              body="Free up your time to focus on the high-value work that actually makes you money. Let automation handle the rest."
              accentWord="money"
            />
            <StoryBlock
              number="03"
              heading="The system works for you"
              body="A complete system built around your business. Automated workflows, smart tools, and consulting that delivers results."
              accentWord="system"
            />
          </section>

          {/* Service cards */}
          <OfferGrid />

          {/* Credibility metrics */}
          <SocialProofBar />

          {/* Philosophy: modern software runs via agent workflows */}
          <AgentWorkflowsBlock />

          {/* AI Agent */}
          <section className="py-12 lg:py-20">
            <AgentSection />
          </section>

          {/* Community */}
          <CommunityBanner />
        </div>
      </main>
    </>
  );
}
