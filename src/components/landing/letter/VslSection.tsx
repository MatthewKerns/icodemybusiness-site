import { PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { VSL } from "@/content/landing";

/**
 * The letter's opening beat: the promise, then Matthew on video.
 *
 * The video is optional by design. While `VSL.src` is null this renders a
 * poster state that still carries the headline and subhead, so the page is a
 * complete argument on its own — the recording is an upgrade, not a dependency.
 * Publishing it is a one-line change in src/content/landing.ts.
 */
export function VslSection() {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-h1 font-display font-semibold leading-tight text-text-primary">
          {VSL.headline}
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-text-muted">
          {VSL.subhead}
        </p>
      </div>

      <div className="mx-auto mt-12 max-w-4xl">
        <div
          className={cn(
            "relative aspect-video w-full overflow-hidden rounded-xl",
            "border border-border bg-bg-secondary"
          )}
        >
          {VSL.src ? (
            VSL.kind === "file" ? (
              <video
                className="h-full w-full"
                controls
                preload="metadata"
                playsInline
              >
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
            )
          ) : (
            /*
              Poster state. Explicitly not dressed up as a broken player — no
              fake play button that does nothing when clicked. It reads as what
              it is, and the letter continues below regardless.
            */
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <PlayCircle
                className="h-10 w-10 text-gold-dim"
                aria-hidden="true"
              />
              <p className="font-accent text-xs uppercase tracking-[0.2em] text-gold-dim">
                {VSL.posterEyebrow}
              </p>
              <p className="max-w-sm text-sm leading-relaxed text-text-dim">
                Coming shortly. Everything below says the same thing in
                writing — keep reading.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
