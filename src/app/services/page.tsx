import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { EmailCapture } from "@/components/shared/EmailCapture";

export const metadata: Metadata = {
  title: "AI Development Services | iCodeMyBusiness",
  description:
    "Full-stack development meets practical AI. Custom business tools, built and handed over so your team can run them.",
  openGraph: {
    title: "AI Development Services | iCodeMyBusiness",
    description:
      "Full-stack development meets practical AI. Custom business tools, built and handed over so your team can run them.",
    type: "website",
  },
};

const TECH_STACK = [
  { name: "Next.js + React", desc: "Production web applications" },
  { name: "Convex", desc: "Real-time backend & database" },
  { name: "Claude AI", desc: "Custom AI tools & automation" },
  { name: "n8n / Zapier", desc: "Workflow automation" },
  { name: "Stripe", desc: "Payments & billing" },
  { name: "Vercel", desc: "Deployment & infrastructure" },
];

export default function OffersPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-bg-primary px-4 md:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="font-accent text-sm uppercase tracking-wider text-gold">
              Professional Engineering &middot; AI specialist
            </p>
            <h1 className="mt-4 text-h1 font-bold text-text-primary">
              I build AI-powered business tools
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-text-muted">
              Full-stack development meets practical AI.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-text-muted">
              I ask a lot of questions to help pinpoint the root causes and
              underlying problems holding your business back from its true
              growth potential.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="#how-i-work"
                className="rounded-lg border border-border px-6 py-3 font-medium text-text-primary transition-colors hover:border-gold-dim hover:text-gold"
              >
                How I work
              </a>
            </div>
          </div>
        </section>

        {/* How I Work */}
        <section id="how-i-work" className="py-12 md:py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              How I work
            </h2>
            <p className="mt-2 text-center text-text-muted">
              Senior-quality work. No fluff. You pay for output, not overhead.
            </p>

            <div className="mt-10 space-y-6">
              <div className="rounded-xl border border-border bg-bg-secondary p-6">
                <h3 className="text-h3 font-bold text-text-primary">
                  Senior engineering, without the agency price tag
                </h3>
                <p className="mt-3 leading-relaxed text-text-muted">
                  Most agencies staff your project with junior devs and bill
                  big-agency rates. I work differently: you get senior,
                  professional engineering end to end. I write the architecture,
                  use AI to build faster, and review every line myself — so you
                  get senior-quality work without the agency overhead or the
                  junior-dev guesswork.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {[
                  {
                    number: "01",
                    title: "Discovery & audit",
                    description:
                      "I research your business, map your workflows, and identify the highest-impact automation opportunities before we write a line of code.",
                  },
                  {
                    number: "02",
                    title: "Build & iterate",
                    description:
                      "Rapid development in weekly sprints. You see working software every week — not wireframes, not mockups, real tools you can use.",
                  },
                  {
                    number: "03",
                    title: "Launch & support",
                    description:
                      "Deployment, training, and 30 days of follow-up support included. I make sure the system works in the real world, not just in demo.",
                  },
                ].map((step) => (
                  <div
                    key={step.number}
                    className={cn(
                      "rounded-xl border border-border bg-bg-secondary p-6",
                      "transition-all duration-300 hover:border-gold-dim hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]"
                    )}
                  >
                    <span className="font-accent text-2xl font-bold text-gold">
                      {step.number}
                    </span>
                    <h3 className="mt-3 text-h3 font-semibold text-text-primary">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-text-muted">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Tech Stack */}
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              Tech stack
            </h2>
            <p className="mt-2 text-center text-text-muted">
              Modern tools, proven in production
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TECH_STACK.map((tech) => (
                <div
                  key={tech.name}
                  className="rounded-xl border border-border bg-bg-secondary p-4 transition-colors hover:border-gold-dim"
                >
                  <p className="font-accent text-sm font-semibold text-text-primary">
                    {tech.name}
                  </p>
                  <p className="mt-1 text-xs text-text-dim">{tech.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Email Capture */}
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-2xl">
            <EmailCapture
              source="offers-page"
              headline="Get notified when I open new client spots"
              subtitle="I take on a limited number of projects at a time. Drop your email and I'll let you know when a slot opens up."
              buttonLabel="Notify Me"
              successMessage="You're on the list! We'll notify you when a spot opens."
            />
          </div>
        </section>
      </div>
    </main>
  );
}
