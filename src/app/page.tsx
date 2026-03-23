import { SplashScreen } from "@/components/landing/SplashScreen";
import { ImmersiveHero } from "@/components/landing/ImmersiveHero";
import { StoryBlock } from "@/components/landing/StoryBlock";
import { OfferGrid } from "@/components/landing/OfferGrid";
import { SocialProofBar } from "@/components/landing/SocialProofBar";
import { TestimonialSection } from "@/components/landing/TestimonialSection";
import { EmailCapture } from "@/components/shared/EmailCapture";
import { CommunityBanner } from "@/components/landing/CommunityBanner";

function HeroContent() {
  return (
    <>
      <h2 className="text-h1 font-bold text-text-primary">
        Premium Consulting &amp; AI Automation
      </h2>
      <p className="mt-4 max-w-2xl text-text-muted">
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

          {/* Testimonials — placeholder until real ones are earned */}
          <TestimonialSection />

          {/* Community */}
          <CommunityBanner />

          {/* Email capture */}
          <section className="py-12 lg:py-20">
            <div className="mx-auto max-w-2xl">
              <EmailCapture
                variant="full"
                source="homepage"
                headline="Get free AI tools instantly"
                subtitle="Enter your email for immediate access. No credit card. No catch."
              />
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
