import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { EmailCapture } from "@/components/shared/EmailCapture";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { CommunityBanner } from "@/components/landing/CommunityBanner";
import {
  Plug,
  Languages,
  Lightbulb,
  PackageCheck,
  Radar,
  Wrench,
  ShieldCheck,
  MessageCircle,
  Check,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Mango MCP — Client context tools for dev contractors | iCodeMyBusiness",
  description:
    "Free MCP tools that help dev contractors speak their client's language: client-tuned decision briefs, deliverable summaries without jargon, and a status agent your client can query any time — that only shows what you approve.",
  openGraph: {
    title: "Mango MCP — Client context tools for dev contractors",
    description:
      "Translate decisions and deliverables into your client's language, and give them an anytime status agent you fully control. Free for dev contractors.",
    type: "website",
  },
};

const TOOLS = [
  {
    icon: Lightbulb,
    name: "Client-Tuned Decision Briefs",
    tagline: "Explain the call in the language they actually think in.",
    description:
      "Mango takes a technical decision — the stack choice, the tradeoff, the scope cut — and reframes it around what this specific client cares about: their budget, their timeline, their users, their KPIs. One decision, rewritten for the person reading it.",
    plan: "Free",
  },
  {
    icon: PackageCheck,
    name: "Deliverables in Their Words",
    tagline: "Ship notes a non-technical client will actually read.",
    description:
      "When you mark work done, Mango writes the summary your client understands: what changed, why it matters to their business, and what they can now do — minus the jargon. The handoff stops getting lost in translation.",
    plan: "Free",
  },
  {
    icon: Radar,
    name: "The Anytime Status Agent",
    tagline: "Give your client a status line that never interrupts you.",
    description:
      "Your client gets an AI agent they can ask for project status any time. But you stay in control: nothing publishes until you approve it. Status syncs from your real system only when you mark it ready — so they see truth, never half-finished work or a guessed ETA.",
    plan: "Advanced",
  },
];

const PROBLEMS = [
  "Your status updates read like commit logs — the client just wanted to know if launch is still on.",
  "The architecture decision you agonized over lands as “ok, sounds good.” They didn't follow any of it.",
  "They ping you every Tuesday for an update, and you context-switch out of deep work to rewrite the same paragraph.",
];

const STEPS = [
  {
    icon: Wrench,
    number: "01",
    title: "You work in your own system",
    description:
      "Track work where you already do — Clockify, your task board, your own notes. Nothing is shared with anyone by default.",
  },
  {
    icon: ShieldCheck,
    number: "02",
    title: "You preview, then publish",
    description:
      "Mango shows you exactly what the client would see. Approve it, and only then does it sync. Premature ETAs and work-in-progress stay private.",
  },
  {
    icon: MessageCircle,
    number: "03",
    title: "Your client self-serves",
    description:
      "They ask their agent “are we on track?” and get the answer you approved — accurate, on-brand, and available 24/7 without pulling you out of flow.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "Free",
    blurb: "The two tools that fix most client communication.",
    highlighted: false,
    features: [
      "Client-Tuned Decision Briefs",
      "Deliverables in Their Words",
      "Unlimited clients",
      "Connect as an MCP server in minutes",
    ],
    cta: "Get setup details",
  },
  {
    name: "Advanced",
    price: "Waitlist",
    blurb: "Add the always-on status agent you fully control.",
    highlighted: true,
    features: [
      "Everything in Free",
      "The Anytime Status Agent",
      "Contractor-gated state sync (preview → publish)",
      "Per-client tone & branding",
    ],
    cta: "Join the waitlist",
  },
];

const FAQ_ITEMS = [
  {
    question: "What is this, technically?",
    answer:
      "It's an MCP (Model Context Protocol) server. You connect it to Claude — or any MCP-compatible client — and your contractor tools show up as commands. If you've wired up an MCP server before, setup is a couple of minutes.",
  },
  {
    question: "Does my client need an account?",
    answer:
      "For decision briefs and deliverable summaries, no — you generate the asset and send it however you already do. The Anytime Status Agent (Advanced) is the only piece that gives the client direct access, and you control exactly what it can see.",
  },
  {
    question: "What systems does it connect to?",
    answer:
      "Mango reads from where you already track work — Clockify and your task system — so summaries reflect reality instead of a status doc you have to keep updated by hand.",
  },
  {
    question: "Is my client data private?",
    answer:
      "Yes. Nothing syncs to a client until you preview and approve it. You decide what's shared, per client, every time. Your raw time entries and internal notes never leave your system.",
  },
  {
    question: "How does it stay accurate without me babysitting it?",
    answer:
      "It pulls from your real system, but it only publishes what you've marked ready. The status agent answers from approved state — so it's never ahead of reality, and never guessing.",
  },
  {
    question: "Why is this free?",
    answer:
      "Because the best clients come from contractors who communicate well — and the best network is one of contractors who do. The core tools are free. Advanced adds the always-on status agent.",
    cta: { text: "Join the network", href: "#network" },
  },
];

export default function MangoPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-bg-primary px-4 md:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-7xl">
        {/* Hero */}
        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-dim bg-gold/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gold">
              <Plug className="h-3.5 w-3.5" aria-hidden="true" />
              Free MCP tools for dev contractors
            </span>

            <h1 className="mt-6 text-h1 font-bold leading-tight text-text-primary">
              Your clients don&apos;t speak Git.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
              Mango is a set of context-sharing tools that translate your
              technical decisions and deliverables into language your client
              actually understands — and give them a status agent they can query
              any time, that only ever shows what you approve.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#waitlist"
                className="flex h-12 w-full items-center justify-center rounded-lg bg-gold px-6 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] sm:w-auto"
              >
                Get early access
              </a>
              <a
                href="#network"
                className="flex h-12 w-full items-center justify-center rounded-lg border border-border px-6 font-medium text-text-primary transition-colors hover:border-gold-dim hover:text-gold sm:w-auto"
              >
                Join the network
              </a>
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-center gap-3">
              <Languages className="h-6 w-6 text-blue" aria-hidden="true" />
              <h2 className="text-h2 font-bold text-text-primary">
                The work isn&apos;t the hard part. The translation is.
              </h2>
            </div>
            <p className="mt-3 text-center text-text-muted">
              Most dev contractors don&apos;t lose clients on code quality. They
              lose them on communication.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              {PROBLEMS.map((problem) => (
                <div
                  key={problem}
                  className="rounded-xl border border-border bg-bg-secondary p-5 text-sm leading-relaxed text-text-muted"
                >
                  {problem}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The tools */}
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              Three tools, one job: be understood
            </h2>
            <p className="mt-2 text-center text-text-muted">
              Each runs as a command inside your AI client. No new dashboard to
              live in.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {TOOLS.map((tool) => (
                <div
                  key={tool.name}
                  className={cn(
                    "flex h-full flex-col rounded-xl border border-border bg-bg-secondary p-6",
                    "transition-all duration-300 hover:border-gold-dim hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-bg-tertiary">
                      <tool.icon className="h-6 w-6 text-gold" aria-hidden="true" />
                    </div>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide",
                        tool.plan === "Advanced"
                          ? "bg-blue/10 text-blue"
                          : "bg-gold/10 text-gold"
                      )}
                    >
                      {tool.plan}
                    </span>
                  </div>

                  <h3 className="mt-4 text-xl font-bold leading-tight text-text-primary">
                    {tool.name}
                  </h3>
                  <p className="mt-1.5 text-sm font-medium text-gold-light">
                    {tool.tagline}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">
                    {tool.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How the gated status works */}
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              Real-time status, on your terms
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-text-muted">
              The Anytime Status Agent gives your client a live answer without
              giving up your control over the narrative.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((step) => (
                <div
                  key={step.number}
                  className="rounded-xl border border-border bg-bg-secondary p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-accent text-2xl font-bold text-gold">
                      {step.number}
                    </span>
                    <step.icon
                      className="h-5 w-5 text-text-dim"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="mt-4 text-h3 font-semibold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-gold-dim bg-gold/5 p-6 text-center">
              <p className="mx-auto max-w-2xl text-sm leading-relaxed text-text-muted">
                <span className="font-semibold text-gold">
                  You control the narrative; the client gets the truth.
                </span>{" "}
                Nothing reaches them until you preview it and publish it — so the
                agent is always accurate and never ahead of your actual progress.
              </p>
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              Start free. Upgrade when you want the status agent.
            </h2>
            <p className="mt-2 text-center text-text-muted">
              No credit card to start. The core communication tools are free for
              every contractor.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={cn(
                    "flex h-full flex-col rounded-xl border bg-bg-secondary p-6",
                    plan.highlighted
                      ? "border-gold-dim shadow-[0_0_24px_rgba(212,175,55,0.1)]"
                      : "border-border"
                  )}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-h3 font-bold text-text-primary">
                      {plan.name}
                    </h3>
                    <span className="font-accent text-sm font-semibold text-gold">
                      {plan.price}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-text-muted">{plan.blurb}</p>

                  <ul className="mt-5 flex flex-1 flex-col gap-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm text-text-primary"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                          aria-hidden="true"
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <a
                    href="#waitlist"
                    className={cn(
                      "mt-6 flex h-12 items-center justify-center rounded-lg px-6 font-medium transition-shadow",
                      plan.highlighted
                        ? "bg-gold text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                        : "border border-border text-text-primary transition-colors hover:border-gold-dim hover:text-gold"
                    )}
                  >
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why free / networking */}
        <section id="network" className="py-12 md:py-16">
          <div className="mx-auto max-w-3xl rounded-xl border border-border bg-bg-secondary p-8 text-center">
            <h2 className="text-h2 font-bold text-text-primary">
              Built from how I run my own client work
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-text-muted">
              These are the exact tools I use to keep my own clients informed
              without drowning in status meetings. I&apos;m opening them up for
              two reasons: communication is the thing most dev contractors lose
              clients over, and I&apos;d rather build a network of contractors
              who do it well. Use the tools. Join the room. Trade what works.
            </p>
          </div>
        </section>

        {/* Community */}
        <CommunityBanner />

        {/* FAQ */}
        <section className="py-12 md:py-20">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              Questions other devs ask
            </h2>
            <div className="mt-10">
              <FAQAccordion items={FAQ_ITEMS} />
            </div>
          </div>
        </section>

        {/* Waitlist / lead capture */}
        <section id="waitlist" className="py-12 md:py-20">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              Get your Mango connection details
            </h2>
            <p className="mt-2 text-center text-text-muted">
              Drop your email and I&apos;ll send setup instructions plus early
              access to the Anytime Status Agent.
            </p>

            <div className="mt-8">
              <EmailCapture
                source="mango-mcp"
                headline="Get early access"
                subtitle="Enter your email for setup instructions and the Advanced waitlist."
                buttonLabel="Get Early Access"
                successMessage="You're on the list — check your email for setup details."
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
