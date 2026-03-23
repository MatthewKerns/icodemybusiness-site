import { cn } from "@/lib/utils";
import { CaseStudyFilter } from "@/components/landing/CaseStudyFilter";
import { EmailCapture } from "@/components/shared/EmailCapture";

const CASE_STUDIES = [
  {
    slug: "eos-implementation-dashboard",
    category: "AUTOMATION",
    title: "EOS Implementation Dashboard",
    summary:
      "Built a real-time Entrepreneurial Operating System dashboard that replaced 6 spreadsheets and 3 weekly meetings with a single automated command center.",
    metric: "12 hrs/week saved per leadership team",
    challenge:
      "A 40-person services company ran EOS on spreadsheets. Scorecard updates took 2 hours weekly, rocks were tracked in a separate tool, and the L10 agenda lived in yet another doc. Leadership spent more time updating systems than making decisions.",
    solution:
      "Designed a Convex-backed dashboard with live scorecards, rock tracking, and auto-generated L10 agendas. Integrated with QuickBooks and HubSpot to pull actuals automatically. Added Slack notifications for off-track metrics.",
    results:
      "Eliminated 12 hours/week of manual data entry across the leadership team. L10 meetings shortened from 90 to 60 minutes. Scorecard accuracy went from ~70% to 99% because data flows directly from source systems.",
  },
  {
    slug: "ai-content-pipeline",
    category: "AI_TOOLS",
    title: "AI Content Pipeline",
    summary:
      "Created an AI-powered content system that turns one client interview into a week of platform-specific posts, emails, and blog drafts.",
    metric: "5x content output, 80% less writing time",
    challenge:
      "A solo consultant was spending 10+ hours per week writing LinkedIn posts, newsletters, and blog content. Quality was inconsistent and they kept falling behind on their publishing schedule.",
    solution:
      "Built a Claude-powered pipeline: record a 20-minute voice memo, auto-transcribe it, then generate platform-optimized drafts for LinkedIn, email, and blog. Each piece matches the client's voice and includes a human review step before publishing.",
    results:
      "Content output went from 2 posts/week to 10+ across platforms. Writing time dropped from 10 hours to 2 hours (review and editing only). Newsletter open rates increased 23% because content was more consistent and timely.",
  },
  {
    slug: "business-process-audit",
    category: "CONSULTING",
    title: "Business Process Audit & Automation Map",
    summary:
      "Conducted a deep-dive operational audit for a digital agency, identifying $47K/year in labor costs that could be automated with existing tools.",
    metric: "$47K/yr in automatable labor identified",
    challenge:
      "A 15-person digital agency felt overwhelmed but couldn't pinpoint where time was leaking. They suspected they needed to hire two more people but weren't sure the revenue justified it.",
    solution:
      "Ran a 2-week process audit: interviewed every team member, mapped 23 workflows end-to-end, and scored each for automation potential. Delivered a prioritized roadmap with ROI estimates, starting with three quick wins that needed zero new tools.",
    results:
      "Identified $47K/year in automatable labor across client onboarding, reporting, and invoicing. The three quick wins saved 8 hours/week within the first month. The agency decided to automate instead of hire, improving margins by 15%.",
  },
];

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
              Amazon-trained engineer &middot; AI specialist
            </p>
            <h1 className="mt-4 text-h1 font-bold text-text-primary">
              I build AI-powered business tools
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-text-muted">
              Full-stack development meets practical AI. I turn manual
              workflows into automated systems that save real hours every
              week — not theoretical improvements, measurable ones.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="#case-studies"
                className={cn(
                  "rounded-lg bg-gold px-6 py-3 font-medium text-black transition-shadow",
                  "hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                )}
              >
                See my work
              </a>
              <a
                href="#how-i-work"
                className="rounded-lg border border-border px-6 py-3 font-medium text-text-primary transition-colors hover:border-gold-dim hover:text-gold"
              >
                How I work
              </a>
            </div>
          </div>
        </section>

        {/* Case Studies */}
        <section id="case-studies" className="py-12 md:py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              Case Studies
            </h2>
            <p className="mt-2 text-center text-text-muted">
              Real projects. Real metrics. Real business impact.
            </p>

            <div className="mt-10">
              <CaseStudyFilter studies={CASE_STUDIES} />
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
              Transparent pricing. No fluff. You pay for output, not overhead.
            </p>

            <div className="mt-10 space-y-6">
              <div className="rounded-xl border border-border bg-bg-secondary p-6">
                <h3 className="text-h3 font-bold text-text-primary">
                  The $50/hr dev model
                </h3>
                <p className="mt-3 leading-relaxed text-text-muted">
                  Most agencies charge $150-300/hr and staff your project with
                  junior devs. I work differently: you get a senior
                  Amazon-trained engineer at $50/hr because I use AI to multiply
                  my output. I write the architecture, the AI helps me build
                  faster, and I review every line. You get senior-quality work at
                  a fraction of the cost.
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
            />
          </div>
        </section>
      </div>
    </main>
  );
}
