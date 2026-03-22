import { OfferCard } from "./OfferCard";

const OFFERS = [
  {
    icon: "\u{1F680}",
    title: "AI Launchpad",
    description: "1-on-1 consulting to automate your business with AI.",
    href: "/consulting",
  },
  {
    icon: "\u26A1",
    title: "Workflow Platform",
    description: "Subscribe to guided AI workflows and Claude skills.",
    href: "/subscribe",
  },
  {
    icon: "\u{1F381}",
    title: "Free Tools",
    description: "Claude Project Packs and skills you can use today.",
    href: "/free-tools",
  },
  {
    icon: "\u{1F6E0}\uFE0F",
    title: "Dev Services",
    description: "Custom development, automation, and AI integrations.",
    href: "/services",
  },
] as const;

export function OfferGrid() {
  return (
    <section className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-h2 font-bold text-text-primary">
          What I can do for you
        </h2>
        <p className="mt-2 text-center text-text-muted">
          Choose your path. Every option delivers real results.
        </p>
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {OFFERS.map((offer) => (
            <OfferCard key={offer.href} {...offer} />
          ))}
        </div>
      </div>
    </section>
  );
}
