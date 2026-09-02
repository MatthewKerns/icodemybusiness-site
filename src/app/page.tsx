import { LandingPage } from "@/components/landing/letter/LandingPage";
import { DiagramHero } from "@/components/landing/letter/DiagramHero";

/**
 * The entry point: the letter, led by diagrams.
 *
 * The video-led variant of this same page lives at /vsl. When it wins, this file
 * swaps its two lines for VideoHero and /vsl is deleted — no content moves.
 */
export default function Home() {
  return <LandingPage surface="diagram" hero={<DiagramHero />} />;
}
