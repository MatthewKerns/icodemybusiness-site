import type { Metadata } from "next";
import Link from "next/link";
import { Plug, Sparkles, Wrench, Boxes, Palette, ArrowRight, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Claude Connectors",
  description:
    "Add our tools to Claude as connectors. Step-by-step setup for the Mango Claude Connector, the Software Builder Tools MCP, Inventory Hero, and the IDEA Brand Coach — most tools free, no account to start.",
  openGraph: {
    title: "Claude Connectors — free tools inside Claude",
    description:
      "Add Mango, the Software Builder Tools MCP, Inventory Hero, and the IDEA Brand Coach to Claude. Most tools free, no account to start.",
    type: "website",
  },
};

const CONNECTORS = [
  {
    icon: Sparkles,
    name: "Mango",
    audience: "For founders & their clients",
    blurb:
      "Translate technical decisions and deliverables into language your client understands — and give them a status agent you fully control.",
    href: "/connect/mango",
    cta: "Set up Mango",
    external: false,
  },
  {
    icon: Wrench,
    name: "Software Builder Tools",
    audience: "For developers",
    blurb:
      "My continuously-updated engineering best-practices guide — reference docs, skills, agents, and checklists — exposed as MCP tools in Claude.",
    href: "/connect/builder-tools",
    cta: "Install the MCP",
    external: false,
  },
  {
    icon: Boxes,
    name: "Inventory Hero",
    audience: "For Amazon sellers",
    blurb:
      "Run your Amazon FBA business from any Claude chat — restock planning, sales velocity, and profitability, grounded in your live inventory, suppliers, and purchase orders.",
    href: "https://www.inventoryhero.ai",
    cta: "Set up Inventory Hero",
    external: true,
  },
  {
    icon: Palette,
    name: "IDEA Brand Coach",
    audience: "For brand builders",
    blurb:
      "Build an emotionally resonant brand with the IDEA Strategic Brand Framework™ — concepts, copy, a Trust Gap™ diagnostic, and a gold-workbook export.",
    href: "https://ideabrandcoach.icodemybusiness.com/onboard.html",
    cta: "Set up Brand Coach",
    external: true,
  },
] as const;

export default function ConnectHubPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-bg-primary px-4 md:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-5xl">
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-dim bg-gold/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gold">
              <Plug className="h-3.5 w-3.5" aria-hidden="true" />
              Claude Connectors
            </span>
            <h1 className="mt-6 text-h1 font-bold leading-tight text-text-primary">
              Add our tools to Claude
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
              Each of these adds a set of tools to Claude — they show up in any
              chat. Most tools are free, and there&apos;s nothing to sign up for
              to get started.
            </p>
          </div>
        </section>

        <section className="pb-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {CONNECTORS.map((c) => (
              <Link
                key={c.name}
                href={c.href}
                {...(c.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="group flex h-full flex-col rounded-xl border border-border bg-bg-secondary p-6 transition-all duration-300 hover:border-gold-dim hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-bg-tertiary">
                  <c.icon className="h-6 w-6 text-gold" aria-hidden="true" />
                </div>
                <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-text-dim">
                  {c.audience}
                </p>
                <h2 className="mt-1 text-h3 font-bold text-text-primary">
                  {c.name}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">
                  {c.blurb}
                </p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-gold">
                  {c.cta}
                  {c.external ? (
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ArrowRight
                      className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  )}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
