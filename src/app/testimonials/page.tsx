import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Star, Quote, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTestimonialFeed } from "./mango-sync";
import type { Testimonial } from "./testimonials-data";

/**
 * Testimonials — STRATEGIC DRAFT.
 *
 * This page is intentionally kept off the live site:
 *  1. It is not linked from the NavBar / Footer.
 *  2. It is marked noindex/nofollow (see metadata below).
 *  3. It 404s in production builds unless explicitly opted in via
 *     NEXT_PUBLIC_ENABLE_TESTIMONIALS_DRAFT=true (see the gate in the page).
 *
 * Remove the gate + the DraftBanner only once quotes are verified and consented.
 */

export const metadata: Metadata = {
  title: "Testimonials (Draft) — iCodeMyBusiness",
  description:
    "Internal draft of aspirational client testimonials. Not for public release.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

/**
 * Draft gate: visible in local dev, or anywhere the explicit opt-in flag is
 * set. Everywhere else (incl. the staging auto-deploy) it returns 404.
 */
function isDraftVisible(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_TESTIMONIALS_DRAFT === "true"
  );
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div
      className="flex gap-0.5"
      aria-label={`${rating} out of 5 stars`}
      role="img"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-4 w-4",
            i < rating ? "fill-gold text-gold" : "fill-none text-text-dim"
          )}
        />
      ))}
    </div>
  );
}

function DraftBanner({ source }: { source: string }) {
  return (
    <div className="border-b border-gold/30 bg-gold-glow">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-center">
        <Lock className="h-3.5 w-3.5 text-gold" aria-hidden />
        <span className="font-accent text-xs uppercase tracking-wider text-gold">
          Internal draft — not live
        </span>
        <span className="text-xs text-text-dim">
          Aspirational North-Star quotes · data source:{" "}
          <span className="font-accent">{source}</span> · replace with verified
          testimonials before release
        </span>
      </div>
    </div>
  );
}

function TestimonialBlock({ t }: { t: Testimonial }) {
  return (
    <figure className="flex h-full flex-col rounded-xl border border-border bg-bg-secondary p-6 transition-all duration-300 hover:border-gold-dim hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]">
      <StarRow rating={t.rating} />
      {t.highlight && (
        <span className="mt-4 inline-flex w-fit rounded-full border border-border-gold bg-gold-glow px-3 py-1 font-accent text-xs text-gold">
          {t.highlight}
        </span>
      )}
      <blockquote className="mt-4 flex-1 text-sm italic leading-relaxed text-text-muted">
        &ldquo;{t.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-5 border-t border-border pt-4">
        <p className="text-sm font-medium text-text-primary">{t.author}</p>
        <p className="text-xs text-text-dim">
          {t.role}
          {t.company ? ` · ${t.company}` : ""}
        </p>
      </figcaption>
    </figure>
  );
}

export default async function TestimonialsPage() {
  if (!isDraftVisible()) {
    notFound();
  }

  const { featured, testimonials, stats, source } = await getTestimonialFeed();

  return (
    <>
      <DraftBanner source={source} />
      <main
        id="main-content"
        className="min-h-screen bg-bg-primary px-4 md:px-6 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          {/* Hero */}
          <section className="py-16 md:py-24">
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-accent text-sm uppercase tracking-wider text-gold">
                Proof, not promises
              </p>
              <h1 className="mt-4 text-h1 font-bold text-text-primary">
                Results worth talking about
              </h1>
              <p className="mt-4 text-lg leading-relaxed text-text-muted">
                Senior, Amazon-trained engineering at a rate that doesn&rsquo;t
                make sense until you see the output. Here&rsquo;s what it looks
                like when technology finally feels like leverage instead of
                overhead.
              </p>

              {/* Aggregate stats */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-h2 font-bold text-text-primary">
                      {stats.averageRating.toFixed(1)}
                    </span>
                    <StarRow rating={5} />
                  </div>
                  <p className="mt-1 text-xs text-text-dim">Average rating</p>
                </div>
                <div className="text-center">
                  <span className="text-h2 font-bold text-text-primary">
                    {stats.totalReviews}
                  </span>
                  <p className="mt-1 text-xs text-text-dim">Five-star reviews</p>
                </div>
                <div className="text-center">
                  <span className="text-h2 font-bold text-text-primary">
                    {stats.wouldRecommend}%
                  </span>
                  <p className="mt-1 text-xs text-text-dim">Would recommend</p>
                </div>
              </div>
            </div>
          </section>

          {/* Featured testimonial */}
          <section className="pb-12 md:pb-20">
            <figure className="mx-auto max-w-4xl rounded-2xl border border-border-gold bg-bg-secondary p-8 md:p-12 animate-pulse-glow">
              <Quote className="h-10 w-10 text-gold" aria-hidden />
              <blockquote className="mt-6 text-xl leading-relaxed text-text-primary md:text-2xl">
                &ldquo;{featured.quote}&rdquo;
              </blockquote>
              <figcaption className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-text-primary">
                    {featured.author}
                  </p>
                  <p className="text-sm text-text-dim">
                    {featured.role}
                    {featured.company ? ` · ${featured.company}` : ""}
                  </p>
                </div>
                <StarRow rating={featured.rating} />
              </figcaption>
            </figure>
          </section>

          {/* Wall of testimonials */}
          <section className="pb-12 md:pb-20">
            <h2 className="text-center text-h2 font-bold text-text-primary">
              What clients say
            </h2>
            <p className="mt-2 text-center text-text-muted">
              Real capabilities. Measurable outcomes. The bar we build to.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <TestimonialBlock key={t.author} t={t} />
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="pb-20 md:pb-28">
            <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-bg-secondary p-8 text-center md:p-12">
              <h2 className="text-h2 font-bold text-text-primary">
                Want your name on this page?
              </h2>
              <p className="mt-3 leading-relaxed text-text-muted">
                Bring me a workflow that&rsquo;s eating your week. I&rsquo;ll
                show you what it looks like automated — in working software, not
                slides.
              </p>
              <a
                href="/consulting#booking"
                className={cn(
                  "mt-8 inline-flex rounded-lg bg-gold px-6 py-3 font-medium text-black transition-shadow",
                  "hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                )}
              >
                Book a Call
              </a>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
