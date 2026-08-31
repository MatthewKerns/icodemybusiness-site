import Link from "next/link";
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
        Learn to Build Your Own Software
      </h2>
      <p className="mt-4 max-w-2xl mx-auto text-text-muted">
        A developer academy for founders who are done outsourcing the thing
        their business runs on. Build it yourself — professionally.
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href="/academy"
          className="inline-flex h-12 items-center rounded-lg bg-gold px-6 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          Join the Academy
        </Link>
        <Link
          href="/free-tools"
          className="inline-flex h-12 items-center rounded-lg border border-border px-6 font-medium text-text-muted transition-colors hover:border-gold-dim hover:text-gold"
        >
          Start with the free tools
        </Link>
      </div>
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
              heading="Stop renting your software"
              body="Every business runs on software, and most owners rent theirs. That works until the day you need it to change — then you are waiting on someone else's roadmap."
              accentWord="renting"
            />
            <StoryBlock
              number="02"
              heading="Build it the professional way"
              body="Not coding as a hobby. Branches, review, tests, deploys — the habits that make software you can actually trust in your business."
              accentWord="professional"
            />
            <StoryBlock
              number="03"
              heading="Agents do the volume, you hold the judgment"
              body="One determined owner directing agents against a well-specified goal can now ship what used to take a team. That leverage is the whole curriculum."
              accentWord="judgment"
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
