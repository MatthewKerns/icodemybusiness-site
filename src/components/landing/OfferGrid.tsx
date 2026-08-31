import { OfferCard } from "./OfferCard";

const OFFERS = [
  {
    icon: "\u{1F393}",
    title: "The Academy",
    description: "Learn to build the software your business runs on.",
    href: "/academy",
  },
  {
    icon: "\u{1F381}",
    title: "Free Tools",
    description: "The builder packs and skills I use every day.",
    href: "/free-tools",
  },
  {
    icon: "\u26A1",
    title: "Workflow Platform",
    description: "Subscribe to guided AI workflows and Claude skills.",
    href: "/subscribe",
  },
  {
    icon: "\u{1F680}",
    title: "AI Launchpad",
    description: "Prefer it built for you? 1-on-1 consulting.",
    href: "/consulting",
  },
  {
    icon: "\u{1F6E0}\uFE0F",
    title: "Dev Services",
    description: "Custom development, automation, and AI integrations.",
    href: "/services",
  },
  {
    icon: "\u{1F6D2}",
    title: "Custom E-Commerce Tools",
    description: "Apply for a bespoke AI automation set built for your store.",
    href: "/custom-tools",
  },
] as const;

export function OfferGrid() {
  return (
    <section className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-h2 font-bold text-text-primary">
          Where to start
        </h2>
        <p className="mt-2 text-center text-text-muted">
          Learn to build it yourself, or have it built for you.
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
