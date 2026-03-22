import { cn } from "@/lib/utils";

export function ConsultingHero() {
  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-4xl text-center">
        <p className="font-accent text-sm uppercase tracking-widest text-gold">
          The AI Launchpad
        </p>

        <h1 className="mt-4 text-display font-bold text-text-primary">
          Go from overwhelmed{" "}
          <span className="text-gold">to automated</span>{" "}
          in one session
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-text-muted">
          A focused, high-impact consulting session where I research your
          business, map your workflows, and hand you a ready-to-execute AI
          system — not theory, not a pitch deck, a working plan.
        </p>

        {/* Price anchor */}
        <div className="mt-10 flex flex-col items-center gap-2">
          <div className="flex items-center gap-3">
            <span className="text-xl text-text-dim line-through">
              $200/hr
            </span>
            <span className="rounded-full bg-gold/10 px-3 py-1 font-accent text-sm font-medium text-gold">
              75% OFF
            </span>
          </div>
          <p className="text-lg text-text-muted">
            <span className="font-semibold text-text-primary">$50/hr</span>{" "}
            prep +{" "}
            <span className="font-semibold text-text-primary">$75/hr</span>{" "}
            live call
          </p>
        </div>

        {/* CTA */}
        <a
          href="#booking"
          className={cn(
            "mt-10 inline-flex h-14 items-center justify-center rounded-lg bg-gold px-8 text-lg font-semibold text-black",
            "transition-shadow duration-300 hover:shadow-[0_0_30px_rgba(212,175,55,0.35)]",
            "animate-pulse-glow"
          )}
        >
          Book your AI Launchpad — 4 spots this month
        </a>
      </div>
    </section>
  );
}
