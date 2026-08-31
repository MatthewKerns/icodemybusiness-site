import type { Metadata } from "next";
import Link from "next/link";
import { EmailCapture } from "@/components/shared/EmailCapture";
import { CommunityBanner } from "@/components/landing/CommunityBanner";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import {
  Boxes,
  GitBranch,
  Workflow,
  ShieldCheck,
  Rocket,
  Users,
} from "lucide-react";

export const metadata: Metadata = {
  title: "The Academy",
  description:
    "Learn to build your own software, professionally. A developer academy for founders who are done outsourcing the thing their business runs on.",
  openGraph: {
    title: "The Academy — iCodeMyBusiness",
    description:
      "Learn to build your own software, professionally. A developer academy for founders who are done outsourcing the thing their business runs on.",
    type: "website",
  },
};

/**
 * Curriculum pillars.
 *
 * These describe how Matthew actually builds — the same practices behind
 * Inventory Hero, Brand Coach, Mango, and this site. Deliberately written as
 * capabilities a member walks away with rather than a week-by-week syllabus;
 * the schedule firms up once cohort one is scoped.
 */
const PILLARS = [
  {
    icon: Boxes,
    title: "Build the thing your business actually needs",
    body: "Start from a real bottleneck in your own company, not a to-do app. You leave with software that runs, that you own, and that you can keep changing.",
  },
  {
    icon: Workflow,
    title: "Work through agents, not keystrokes",
    body: "Modern software gets built by directing agents against a well-specified goal. You learn to write the spec, set the guardrails, and review the output — the leverage most people never pick up.",
  },
  {
    icon: GitBranch,
    title: "Ship like a professional team",
    body: "Branches, review, tests, CI, deploys, rollbacks. The habits that separate software you can trust in production from a prototype that breaks when you look away.",
  },
  {
    icon: ShieldCheck,
    title: "Make it safe to touch",
    body: "Auth, payments, secrets, and data you cannot afford to lose. How to handle the parts where mistakes are expensive, and how to know when to bring in help.",
  },
] as const;

const FOR_YOU = [
  "You run a business and keep hitting the same wall: the tool you need does not exist, and quotes to build it start at five figures.",
  "You have shipped something with AI already, and you can feel where it gets fragile — you just do not know the name of what you are missing.",
  "You are tired of being the person who cannot change their own product.",
] as const;

const NOT_FOR_YOU = [
  "You want a job at a tech company. This is about building for your business, not passing interviews.",
  "You want it done for you. That is real work I do — it is just not this.",
  "You want to watch videos. Every module ends with something running.",
] as const;

const FAQ_ITEMS = [
  {
    question: "Do I need to know how to code already?",
    answer:
      "No, but you do need to be willing to. This is not a no-code course — you will be reading and writing real code, directing agents to write more of it, and understanding what came back. If you have never opened a terminal, you will be slower for the first stretch and you will still get there.",
  },
  {
    question: "How is this different from a bootcamp?",
    answer:
      "A bootcamp prepares you to be hired as a developer. This prepares you to build and run the software your own business depends on — which is a different set of skills, weighted toward shipping, agent workflows, and knowing what you can safely own versus what you should hand off.",
  },
  {
    question: "What will I actually have at the end?",
    answer:
      "Software you built, deployed and running against your real business, plus the working habits to keep extending it. Not a certificate.",
  },
  {
    question: "What does it cost, and when does it start?",
    answer:
      "The first cohort is being scoped now and I am keeping it small on purpose. Join the list and I will write to you directly with the format, the price, and the start date before it opens to anyone else.",
    cta: { text: "Join the list", href: "#join" },
  },
  {
    question: "Who is teaching it?",
    answer:
      "Matthew Kerns — eight-plus years building software professionally, and the person who built the tools on this site: an inventory and restock system used by Amazon sellers, a brand-positioning coach, an agency operations platform, and this site itself. Same practices, taught directly.",
  },
] as const;

export default function AcademyPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-bg-primary px-4 py-12 md:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-6xl">
        {/* Hero */}
        <section className="py-12 text-center lg:py-20">
          <p className="text-xs uppercase tracking-[0.2em] text-gold">
            The Academy
          </p>
          <h1 className="mx-auto mt-4 max-w-4xl text-display font-semibold text-text-primary">
            Learn to build your own software, professionally
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-text-muted">
            For founders who are done outsourcing the thing their business runs
            on. You bring a real problem in your own company. You leave having
            built the software that solves it — and knowing how to keep building.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="#join"
              className="inline-flex h-12 items-center rounded-lg bg-gold px-6 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              Join the list
            </Link>
            <Link
              href="#curriculum"
              className="inline-flex h-12 items-center rounded-lg border border-border px-6 font-medium text-text-muted transition-colors hover:border-gold-dim hover:text-gold"
            >
              See what you learn
            </Link>
          </div>
          <p className="mt-5 text-sm text-text-dim">
            First cohort forming now — small on purpose.
          </p>
        </section>

        {/* The premise */}
        <section className="border-y border-border py-14">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-h2 font-bold text-text-primary">
              &ldquo;I code my business&rdquo; is the whole idea
            </h2>
            <p className="mt-4 text-text-muted">
              Every business now runs on software, and most owners rent theirs —
              from a vendor, an agency, or a tool that almost fits. That is fine
              until the day you need it to change. Then you are waiting on
              someone else&rsquo;s roadmap and paying for the privilege.
            </p>
            <p className="mt-4 text-text-muted">
              The alternative is not learning to code as a hobby. It is learning
              to build the way a professional team builds, at the scale one
              determined owner can actually sustain — with agents doing the
              volume and you holding the judgment.
            </p>
          </div>
        </section>

        {/* Curriculum */}
        <section id="curriculum" className="scroll-mt-24 py-14 lg:py-20">
          <div className="mb-10 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-gold">
              What you learn
            </p>
            <h2 className="mt-2 text-h2 font-bold text-text-primary">
              Four things that compound
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-text-muted">
              Taught against your own project, in this order, because each one
              makes the next one safe.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {PILLARS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border border-border bg-bg-secondary p-6 transition-colors hover:border-gold/30"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-gold/10">
                  <Icon className="h-5 w-5 text-gold" />
                </div>
                <h3 className="font-semibold text-text-primary">{title}</h3>
                <p className="mt-2 text-sm text-text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Fit */}
        <section className="py-14">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gold-dim bg-bg-secondary p-6">
              <h3 className="flex items-center gap-2 font-semibold text-text-primary">
                <Rocket className="h-5 w-5 text-gold" />
                This is for you if
              </h3>
              <ul className="mt-4 space-y-3">
                {FOR_YOU.map((item) => (
                  <li key={item} className="text-sm text-text-muted">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-bg-secondary p-6">
              <h3 className="flex items-center gap-2 font-semibold text-text-primary">
                <Users className="h-5 w-5 text-text-dim" />
                It is not for you if
              </h3>
              <ul className="mt-4 space-y-3">
                {NOT_FOR_YOU.map((item) => (
                  <li key={item} className="text-sm text-text-muted">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Join / email capture — the primary conversion on this page */}
        <section id="join" className="scroll-mt-24 py-14 lg:py-20">
          <div className="mx-auto max-w-2xl">
            <div className="mb-8 text-center">
              <h2 className="text-h2 font-bold text-text-primary">
                Get on the list
              </h2>
              <p className="mt-3 text-text-muted">
                The first cohort is small, and I write to everyone on this list
                personally before it opens. Tell me what you are trying to build
                and I will tell you honestly whether the academy is the right way
                to get there.
              </p>
            </div>
            <EmailCapture
              source="academy"
              headline="Join the academy list"
              subtitle="Format, price, and start date go to this list first. No spam, and you can leave any time."
              buttonLabel="Join the list"
              successMessage="You’re on the list. I’ll be in touch personally — watch your inbox."
            />
          </div>
        </section>

        {/* Start before it opens */}
        <section className="py-14">
          <div className="rounded-xl border border-border bg-bg-secondary p-8 text-center">
            <h2 className="text-h3 font-bold text-text-primary">
              You do not have to wait to start
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-text-muted">
              The builder tools I use every day are free and public. Take them,
              use them on something real, and you will be ahead on day one.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/free-tools"
                className="inline-flex h-11 items-center rounded-lg border border-gold-dim px-5 text-sm font-medium text-gold transition-colors hover:bg-gold/10"
              >
                Free builder tools
              </Link>
              <Link
                href="/connect"
                className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-medium text-text-muted transition-colors hover:border-gold-dim hover:text-gold"
              >
                Set up the connectors
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-14">
          <h2 className="mb-8 text-center text-h2 font-bold text-text-primary">
            Questions
          </h2>
          <FAQAccordion items={[...FAQ_ITEMS]} />
        </section>

        {/* Community */}
        <CommunityBanner />

        {/* Secondary path — done-for-you still exists */}
        <section className="pb-16 text-center">
          <p className="text-sm text-text-dim">
            Would rather have it built for you?{" "}
            <Link
              href="/consulting"
              className="text-gold underline-offset-4 hover:underline"
            >
              That is what the consulting work is for.
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
