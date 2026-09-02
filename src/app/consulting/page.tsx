import Link from "next/link";
import { cn } from "@/lib/utils";
import { ConsultingHero } from "@/components/landing/ConsultingHero";
import { BonusStack } from "@/components/landing/BonusStack";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { CalendlyEmbed } from "@/components/shared/CalendlyEmbed";
import { CommunityBanner } from "@/components/landing/CommunityBanner";
import { ClipboardCheck, Users, Rocket } from "lucide-react";

const CALENDLY_URL =
  // `new-meeting` was deactivated on Calendly (2026-09-02); the only live
  // event is the 15-minute "Introduction Call". A live link beats a dead one
  // even though this page's copy still describes a longer session (R-001).
  process.env.NEXT_PUBLIC_CALENDLY_URL ?? "https://calendly.com/12kernsmatthew/new-meeting-1";

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
];

const STEPS = [
  {
    icon: ClipboardCheck,
    number: "01",
    title: "You book, I prepare",
    description:
      "Once you book a slot, I spend 2-3 hours researching your business, industry, and current workflows. You show up to a call where I already understand your situation.",
    detail: "2-3 hours of prep research",
  },
  {
    icon: Users,
    number: "02",
    title: "We meet",
    description:
      "A focused strategy session where we map your workflows, identify automation opportunities, and build a concrete system together — not theory, action items.",
    detail: "Focused live strategy session",
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
              A clear, focused process. No surprises. No upsells.
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
                    <step.icon className="h-5 w-5 text-text-dim" aria-hidden="true" />
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

            {/* Guarantee */}
            <div
              id="guarantee"
              className="mt-10 rounded-xl border border-gold-dim bg-gold/5 p-6 text-center"
            >
              <h3 className="text-h3 font-bold text-gold">
                The Measurable Progress Guarantee
              </h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
                Implement the system we build together. If you don&apos;t see
                measurable improvement within 30 days — time saved, leads
                generated, or revenue increased — I&apos;ll do a follow-up session at
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

        {/* Pre-call prep note */}
        <section className="py-6 text-center">
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-text-muted">
            <span className="font-semibold text-gold">Want to make the call count?</span>{" "}
            Tell me what&apos;s going on in your business — and upload any
            relevant files — using the{" "}
            <Link
              href="/#top3"
              className="text-gold underline-offset-4 hover:underline"
            >
              live agent on the home page
            </Link>
            . I&apos;ll review it before we meet so we can skip discovery and go
            straight to solutions.
          </p>
        </section>

        {/* Booking section / Email Capture placeholder */}
        <section id="booking" className="py-12 md:py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              Book your free consultation
            </h2>
            <p className="mt-2 text-center text-text-muted">
              Grab a free 30-minute slot below and tell me about your situation
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
