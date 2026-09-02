import { PlayCircle } from "lucide-react";
import { VSL } from "@/content/landing";

/**
 * The video-led hero, used by /vsl.
 *
 * Only the medium lives here — the headline and subhead are identical on both
 * landing pages and belong to LandingPage, so the difference between the two
 * routes stays a single node. That is the whole anti-drift property.
 *
 * A server component: removing the collapsible disclosure removed the only
 * reason this file ever needed client state.
 */
export function VideoHero() {
  if (!VSL.src) {
    return (
      <div className="mx-auto mt-10 max-w-4xl">
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-bg-secondary px-6 text-center">
          <PlayCircle className="h-10 w-10 text-gold-dim" aria-hidden="true" />
          <p className="font-accent text-xs uppercase tracking-[0.2em] text-gold-dim">
            {VSL.posterEyebrow}
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-text-dim">
            Not recorded yet. Nothing here is pressable — the argument continues
            below in full.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-4xl">
      <div className="aspect-video w-full overflow-hidden rounded-xl border border-border bg-bg-secondary">
        {VSL.kind === "file" ? (
          <video className="h-full w-full" controls preload="metadata" playsInline>
            <source src={VSL.src} type="video/mp4" />
            Your browser doesn&apos;t support embedded video.
          </video>
        ) : (
          <iframe
            className="h-full w-full"
            src={VSL.src}
            title="A message from Matthew Kerns"
            allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        )}
      </div>
    </div>
  );
}
