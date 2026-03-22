import { cn } from "@/lib/utils";
import { ConsultingHero } from "@/components/landing/ConsultingHero";
import { BonusStack } from "@/components/landing/BonusStack";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { CalendlyEmbed } from "@/components/shared/CalendlyEmbed";
import { CommunityBanner } from "@/components/landing/CommunityBanner";
import { ClipboardCheck, Users, Rocket } from "lucide-react";

const CALENDLY_URL =
  process.env.NEXT_PUBLIC_CALENDLY_URL ?? "https://calendly.com/icodemybusiness";

const FAQ_ITEMS = [
  {
    question: "What happens before the call?",
    answer:
      "Once you book, I spend 2-3 hours researching your business, industry, competitors, and current workflows. By the time we meet, I already have a draft strategy tailored to your situation — so we can skip the small talk and go straight to building.",
    cta: { text: "Book your session", href: "#booking" },
  },
  {
    question: "What if AI doesn't work for my business?",
    answer:
      "Every business has manual, repetitive workflows that can be improved. During the prep phase I identify the highest-impact opportunities specific to your business. If I genuinely can't find a way to save you time or money, I'll tell you before the call — and you won't be charged for the session.",
    cta: { text: "See the guarantee", href: "#guarantee" },
  },
  {
    question: "Do I need technical experience?",
    answer:
      "Not at all. I translate the technical side into plain language and build systems you can manage yourself. Most of my clients are business owners, not developers. You'll walk away with tools that work, not homework you can't finish.",
  },
  {
    question: "How is this different from other AI consultants?",
    answer:
      "Most consultants give you a slide deck and an invoice. I give you a working system. My prep research means the call is focused on execution, not discovery. And the 30-day follow-up access means I'm invested in your results, not just the session.",
    cta: { text: "See what's included", href: "#bonuses" },
  },
  {
    question: "What's the Measurable Progress Guarantee?",
    answer:
      "If you implement the system we build and don't see measurable improvement within 30 days — whether that's time saved, leads generated, or revenue increased — I'll do a follow-up session at no cost to make it right.",
    cta: { text: "Book risk-free", href: "#booking" },
  },
  {
    question: "Why is the price so low right now?",
    answer:
      "I'm building case studies and testimonials for the AI Launchpad program. Early clients get the full $200/hr-quality service at a fraction of the price in exchange for honest feedback and (with permission) a short testimonial.",
    cta: { text: "Lock in the promo rate", href: "#booking" },
  },
];

const STEPS = [
  {
    icon: ClipboardCheck,
    number: "01",
    title: "You book, I prepare",
    description:
      "Once you book a slot, I spend 2-3 hours researching your business, industry, and current workflows. You show up to a call where I already understand your situation.",
    detail: "Prep rate: $50/hr",
  },
  {
    icon: Users,
    number: "02",
    title: "We meet",
    description:
      "A focused strategy session where we map your workflows, identify automation opportunities, and build a concrete system together — not theory, action items.",
    detail: "Session rate: $75/hr",
  },
  {
    icon: Rocket,
    number: "03",
    title: "You execute",
    description:
      "You walk away with a custom research brief, a recorded session, a Claude project built for your use case, and 30 days of direct follow-up access.",
    detail: "Everything you need to launch",
  },
];

export default function ConsultingPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-bg-primary px-4 md:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <ConsultingHero />

        {/* How It Works */}
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              How it works
            </h2>
            <p className="mt-2 text-center text-text-muted">
              Transparent pricing. No surprises. No upsells.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((step) => (
                <div
                  key={step.number}
                  className={cn(
                    "rounded-xl border border-border bg-bg-secondary p-6",
                    "transition-all duration-300 hover:border-gold-dim hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-accent text-2xl font-bold text-gold">
                      {step.number}
                    </span>
                    <step.icon className="h-5 w-5 text-text-dim" />
                  </div>
                  <h3 className="mt-4 text-h3 font-semibold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {step.description}
                  </p>
                  <p className="mt-4 font-accent text-sm text-gold-dim">
                    {step.detail}
                  </p>
                </div>
              ))}
            </div>

            {/* Pricing summary */}
            <div className="mt-10 rounded-xl border border-border bg-bg-secondary p-6 text-center">
              <p className="text-text-muted">
                Standard rate:{" "}
                <span className="text-text-dim line-through">$200/hr</span>
              </p>
              <p className="mt-1 text-lg text-text-primary">
                AI Launchpad promo:{" "}
                <span className="font-semibold text-gold">$50/hr</span> prep +{" "}
                <span className="font-semibold text-gold">$75/hr</span> call
                <span className="ml-2 text-sm text-text-muted">
                  — 75% off standard rate
                </span>
              </p>
            </div>

            {/* Guarantee */}
            <div
              id="guarantee"
              className="mt-6 rounded-xl border border-gold-dim bg-gold/5 p-6 text-center"
            >
              <h3 className="text-h3 font-bold text-gold">
                The Measurable Progress Guarantee
              </h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
                Implement the system we build together. If you don't see
                measurable improvement within 30 days — time saved, leads
                generated, or revenue increased — I'll do a follow-up session at
                no cost.
              </p>
            </div>
          </div>
        </section>

        {/* Bonus Stack */}
        <div id="bonuses">
          <BonusStack />
        </div>

        {/* FAQ */}
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              Common questions
            </h2>
            <p className="mt-2 text-center text-text-muted">
              Everything you need to know before booking
            </p>

            <div className="mt-10">
              <FAQAccordion items={FAQ_ITEMS} />
            </div>
          </div>
        </section>

        {/* Community */}
        <CommunityBanner />

        {/* Scarcity indicator */}
        <section className="py-6 text-center">
          <p className="font-accent text-sm text-text-muted">
            <span className="font-semibold text-gold">3 of 4</span> consulting
            slots remaining this month
          </p>
        </section>

        {/* Booking section / Email Capture placeholder */}
        <section id="booking" className="py-12 md:py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              Ready to automate?
            </h2>
            <p className="mt-2 text-center text-text-muted">
              Book your AI Launchpad session or join the waitlist below
            </p>

            <div className="mt-8">
              <CalendlyEmbed url={CALENDLY_URL} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
