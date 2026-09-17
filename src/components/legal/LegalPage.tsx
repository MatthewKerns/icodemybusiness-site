import type { ReactNode } from "react";

/**
 * Shared shell for the site's plain-text pages (about, privacy, terms).
 *
 * These exist to be readable by people AND legible to the automated reputation
 * scanners that judge a domain carrying a sign-in: a site offering sign-in with
 * no policy pages scores as an unverifiable one. See docs/trust-pages.md.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bg-primary px-4 py-16 md:px-6 lg:px-12">
      <article className="mx-auto max-w-3xl">
        <h1 className="font-accent text-h2 font-bold text-gold">{title}</h1>
        {updated ? (
          <p className="mt-2 text-sm text-text-dim">Last updated: {updated}</p>
        ) : null}
        <div className="mt-8 space-y-4 text-text-muted [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-text-primary [&_ul]:space-y-2">
          {children}
        </div>
      </article>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="pt-6">
      <h2 className="text-lg font-medium text-text-primary">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
