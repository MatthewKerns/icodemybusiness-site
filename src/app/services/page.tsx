import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EmailCapture } from "@/components/shared/EmailCapture";

export const metadata: Metadata = {
  title: "AI Development Services | iCodeMyBusiness",
  description:
    "A working system your team can run — and the hours back that it frees up.",
  openGraph: {
    title: "AI Development Services | iCodeMyBusiness",
    description:
      "A working system your team can run — and the hours back that it frees up.",
    type: "website",
  },
};

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
              A working system your team can run
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-text-muted">
              The capability of a senior engineering hire inside your business —
              without the search, the seat, or the salary.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-text-muted">
              It starts by finding the one thing costing you the most.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/assessment"
                className="rounded-lg border border-border px-6 py-3 font-medium text-text-primary transition-colors hover:border-gold-dim hover:text-gold"
              >
                Find the one thing to fix first
              </Link>
            </div>
          </div>
        </section>

        {/* What you end up with */}
        <section id="what-you-end-up-with" className="py-12 md:py-20">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              What you end up with
            </h2>

            <div className="mt-10 space-y-6">
              <div className="rounded-xl border border-border bg-bg-secondary p-6">
                <p className="leading-relaxed text-text-muted">
                  Most consultants leave you with a slide deck and an invoice.
                  You end up with a working system your team can run — and the
                  hours back that it frees up.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {[
                  {
                    number: "01",
                    title: "You know the one thing to fix first",
                    description:
                      "Five questions in your own words find it, and you get a write-up.",
                  },
                  {
                    number: "02",
                    title: "You see what changed, every week",
                    description:
                      "Weekly updates come as a short video — a screen share run-through of what changed in the software that week.",
                  },
                  {
                    number: "03",
                    title: "You own it outright",
                    description:
                      "The system, and a plain-language explanation of how it runs. Nothing about it is designed to keep you dependent on me.",
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

        <p className="pb-12 text-center text-sm text-text-dim">
          Built with Next.js, Convex and Claude.
        </p>

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
