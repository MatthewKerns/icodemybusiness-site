import { cn } from "@/lib/utils";

export function ConsultingHero() {
  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-4xl text-center">
        <p className="font-accent text-sm uppercase tracking-widest text-gold">
          Free 15-Minute Intro Call
        </p>

        <h1 className="mt-4 text-display font-bold text-text-primary">
          Let&apos;s figure out where{" "}
          <span className="text-gold">AI fits</span>{" "}
          in your business
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-text-muted">
          Book a free 15-minute call to talk through your business, your biggest
          time-drains, and where AI can help most. You&apos;ll leave with an
          honest read on what&apos;s worth automating — no pitch, no pressure.
        </p>

        {/* CTA */}
        <a
          href="#booking"
          className={cn(
            "mt-10 inline-flex h-14 items-center justify-center rounded-lg bg-gold px-8 text-lg font-semibold text-black",
            "transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(212,175,55,0.35)]",
            "animate-pulse-glow"
          )}
        >
          Book your free 15-minute call
        </a>
      </div>
    </section>
  );
}
