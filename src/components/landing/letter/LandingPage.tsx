import { SplashScreen } from "@/components/landing/SplashScreen";
import { AssessmentGate } from "@/components/landing/AssessmentGate";
import { SalesLetter } from "@/components/landing/letter/SalesLetter";
import { SocialProofBar } from "@/components/landing/SocialProofBar";
import { CommunityBanner } from "@/components/landing/CommunityBanner";
import { DiscoveryAssessmentLazy } from "./DiscoveryAssessmentLazy";
import { LetterSurfaceProvider, type LetterSurface } from "./LetterSurface";
import { VSL } from "@/content/landing";

/**
 * The landing page, everything except which medium leads it.
 *
 * Two routes share this: `/` leads with diagrams, `/vsl` leads with the video.
 * They exist as one component rather than two hand-maintained page files because
 * the copy changes often, and two independently composed trees would drift
 * silently — no test fails when one page quietly stops matching the other.
 *
 * The headline and subhead live here, not in the hero, so the difference between
 * the two pages is exactly one JSX node.
 *
 * The provider is a Client Component but does not pull the letter into the
 * client bundle: its children are server-rendered and pass through as RSC
 * payload.
 */
export function LandingPage({
  surface,
  hero,
}: {
  surface: LetterSurface;
  hero: React.ReactNode;
}) {
  return (
    <>
      <SplashScreen />
      <main
        id="main-content"
        className="min-h-screen bg-bg-primary px-4 md:px-6 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <LetterSurfaceProvider surface={surface}>
            <section className="pt-16 md:pt-24">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="text-h1 font-display font-semibold leading-tight text-text-primary">
                  {VSL.headline}
                </h2>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-muted">
                  {VSL.subhead}
                </p>
              </div>
              {hero}
            </section>

            {/*
              One action, not a menu. A visitor who has just clicked in is looking
              for the next thing to click, so give them exactly one.
            */}
            <AssessmentGate />

            <section id="top3" className="scroll-mt-24 py-12 lg:py-20">
              <div className="mx-auto max-w-5xl">
                <DiscoveryAssessmentLazy />
              </div>
            </section>

            <SalesLetter />
            <SocialProofBar />
            <CommunityBanner />
          </LetterSurfaceProvider>
        </div>
      </main>
    </>
  );
}
