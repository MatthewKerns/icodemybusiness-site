import { SplashScreen } from "@/components/landing/SplashScreen";
import { ImmersiveHero } from "@/components/landing/ImmersiveHero";
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

function HeroContent() {
  return (
    <>
      <h2 className="text-display font-semibold text-text-primary">
        Premium Consulting &amp; AI Automation
      </h2>
      <p className="mt-4 max-w-2xl mx-auto text-text-muted">
        Helping business owners save time and make money with AI-powered
        tools, consulting, and automation systems.
      </p>
    </>
  );
}

export default function Home() {
  return (
    <>
      <SplashScreen />
      <main
        id="main-content"
        className="min-h-screen bg-bg-primary px-4 py-12 md:px-6 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          {/* Desktop Hero — visible at lg+ */}
          <section className="hidden lg:block">
            <ImmersiveHero>
              <HeroContent />
            </ImmersiveHero>
          </section>

          {/* Mobile Hero + Story Blocks — visible below lg */}
          <section className="lg:hidden">
            <div className="py-12">
              <HeroContent />
            </div>

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

          {/* Demo: Top 3 Issues live chat agent */}
          <section id="top3" className="scroll-mt-24 py-12 lg:py-20">
            <div className="mx-auto max-w-5xl">
              <Top3IssuesAgent />
            </div>
          </section>

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
