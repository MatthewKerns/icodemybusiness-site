import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { CalendlyEmbed } from "@/components/shared/CalendlyEmbed";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { Clock, MessageCircle, Sparkles, ShieldCheck } from "lucide-react";

// Dedicated event type for the free 15-minute intro call.
// Falls back to the generic account URL if the intro-specific link isn't set yet.
const CALENDLY_INTRO_URL =
  process.env.NEXT_PUBLIC_CALENDLY_INTRO_URL ??
  process.env.NEXT_PUBLIC_CALENDLY_URL ??
  "https://calendly.com/12kernsmatthew/new-meeting";

export const metadata: Metadata = {
  title: "Book a Free 15-Minute Intro Call | iCodeMyBusiness",
  description:
    "Grab a free, no-pressure 15-minute call to talk through your business and find the highest-impact way AI can save you time. No pitch, no obligation.",
  openGraph: {
    title: "Book a Free 15-Minute Intro Call | iCodeMyBusiness",
    description:
      "Grab a free, no-pressure 15-minute call to talk through your business and find the highest-impact way AI can save you time. No pitch, no obligation.",
    type: "website",
  },
};

const WHAT_WE_COVER = [
  {
    icon: MessageCircle,
    title: "Your biggest time-sink",
    description:
      "Tell me where your week disappears. We'll pinpoint the one workflow that's costing you the most hours.",
  },
  {
    icon: Sparkles,
    title: "Where AI actually fits",
    description:
      "I'll tell you straight whether AI can help — and if it can, the highest-impact place to start.",
  },
  {
    icon: ShieldCheck,
    title: "Your honest next step",
    description:
      "Whether that's a paid session, a DIY tip, or nothing at all.",
  },
];

const FAQ_ITEMS = [
  {
    question: "Is this really free?",
    answer:
      "Yes — completely free, no credit card, no catch. It's a quick 15 minutes for us to see if we're a good fit. If I can genuinely help, I'll tell you how. If I can't, I'll tell you that too.",
  },
  {
    question: "What should I have ready?",
    answer:
      "Nothing formal. Just come with the one or two parts of your business that feel the most manual, repetitive, or overwhelming. That's plenty for us to work with in 15 minutes.",
  },
  {
    question: "Will you try to sell me something?",
    answer:
      "No. This call is about giving you a clear, honest read on whether AI can help your business. If a paid AI Launchpad session makes sense, I'll mention it — but there's zero obligation, and most people leave with at least one idea they can use right away.",
  },
  {
    question: "What if I need more than 15 minutes?",
    answer:
      "If it's clear we have a lot to dig into, we'll talk about the full AI Launchpad session — a deep-dive where I research your business ahead of time and build a working system with you.",
    cta: { text: "See the full session", href: "/consulting" },
  },
];

export default function BookPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-bg-primary px-4 md:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-4xl text-center">
            <p className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-1.5 font-accent text-sm font-medium text-gold">
              <Clock className="h-4 w-4" aria-hidden="true" />
              Free &middot; 15 minutes &middot; No obligation
            </p>

            <h1 className="mt-6 text-display font-bold text-text-primary">
              Let&apos;s find the{" "}
              <span className="text-gold">one thing</span> AI can take off your
              plate
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-text-muted">
              Book a free 15-minute intro call. We&apos;ll talk through your
              business, spot your biggest time-sink, and figure out whether AI
              can actually help.
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
              Grab a free 15-minute slot
            </a>
          </div>
        </section>

        {/* What we'll cover */}
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              What we&apos;ll cover
            </h2>
            <p className="mt-2 text-center text-text-muted">
              Fifteen focused minutes — here&apos;s how we&apos;ll spend them.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {WHAT_WE_COVER.map((item) => (
                <div
                  key={item.title}
                  className={cn(
                    "rounded-xl border border-border bg-bg-secondary p-6",
                    "transition-all duration-300 hover:border-gold-dim hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]"
                  )}
                >
                  <item.icon
                    className="h-6 w-6 text-gold"
                    aria-hidden="true"
                  />
                  <h3 className="mt-4 text-h3 font-semibold text-text-primary">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Booking */}
        <section id="booking" className="py-12 md:py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              Pick a time that works for you
            </h2>
            <p className="mt-2 text-center text-text-muted">
              Choose a 15-minute slot below and you&apos;ll get a calendar
              invite with the call details.
            </p>

            <div className="mt-8">
              <CalendlyEmbed url={CALENDLY_INTRO_URL} />
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              Before you book
            </h2>
            <p className="mt-2 text-center text-text-muted">
              A few quick answers to common questions
            </p>

            <div className="mt-10">
              <FAQAccordion items={FAQ_ITEMS} />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
