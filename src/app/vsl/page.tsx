import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/letter/LandingPage";
import { VideoHero } from "@/components/landing/letter/VideoHero";

/**
 * The video-led variant of the landing page, staged for the VSL.
 *
 * Everything below the hero is the same component `/` uses, so the two cannot
 * drift as the copy changes. Publishing the video is one line in
 * src/content/landing.ts; promoting this design is two lines in src/app/page.tsx.
 *
 * Unlisted while it's a scaffold: noindex, and absent from NAV_LINKS and the
 * footer. Deliberately NOT notFound()-gated the way the testimonials draft is —
 * Matthew needs to open it on staging to judge it.
 */
export const metadata: Metadata = {
  title: "iCodeMyBusiness",
  robots: { index: false, follow: false },
};

export default function VslLandingPage() {
  return <LandingPage surface="video" hero={<VideoHero />} />;
}
