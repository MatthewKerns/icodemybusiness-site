import Link from "next/link";
import Image from "next/image";
import { CopyRow } from "@/components/shared/CopyRow";
import { Plug, ShieldCheck, ArrowRight, MessageCircle, Sparkles } from "lucide-react";

export interface ConnectorStep {
  title: string;
  body: string;
  /** Path to the step screenshot (served from /public). */
  image: string;
  imageAlt: string;
}

export interface ConnectorAsk {
  /** Short label, e.g. "Plan the day". */
  title: string;
  /** The example prompt the user types, e.g. "What should I focus on today?". */
  ask: string;
  /** What it returns. */
  detail: string;
}

export interface ConnectorSetupProps {
  /** Small uppercase badge above the headline. */
  eyebrow: string;
  /** Page H1. */
  title: string;
  /** Intro paragraph under the headline. */
  intro: string;
  /** Suggested connector name to type into Claude. */
  connectorName: string;
  /** The remote MCP server URL. */
  mcpUrl: string;
  /** Label for the URL field. */
  urlLabel: string;
  /** Full Claude Code CLI command (shown as a copy-able alternative). */
  claudeCodeCommand: string;
  /** Small note shown under the CLI command. */
  claudeCodeNote?: string;
  /** Reassurance line shown under the hero. */
  note: string;
  /** The screenshot-by-screenshot walkthrough, in order. */
  steps: ConnectorStep[];
  /** Heading for the "what you can ask" section. */
  asksTitle: string;
  /** Sub-copy for the "what you can ask" section. */
  asksLede: string;
  /** The free things the user can do once connected. */
  asks: ConnectorAsk[];
  /** Optional paid/advanced capability shown after the free list. */
  advanced?: { name: string; blurb: string; price: string };
  /** Closing card heading. */
  closingTitle: string;
  /** Closing card body. */
  closingBody: string;
}

export function ConnectorSetup({
  eyebrow,
  title,
  intro,
  connectorName,
  mcpUrl,
  urlLabel,
  claudeCodeCommand,
  claudeCodeNote,
  note,
  steps,
  asksTitle,
  asksLede,
  asks,
  advanced,
  closingTitle,
  closingBody,
}: ConnectorSetupProps) {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-bg-primary px-4 md:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-5xl">
        {/* Hero */}
        <section className="py-16 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-dim bg-gold/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gold">
              <Plug className="h-3.5 w-3.5" aria-hidden="true" />
              {eyebrow}
            </span>
            <h1 className="mt-6 text-h1 font-bold leading-tight text-text-primary">
              {title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
              {intro}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-4 py-2 text-sm text-text-muted">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
              {note}
            </div>
          </div>
        </section>

        {/* Screenshot-by-screenshot walkthrough */}
        <section className="pb-8">
          <h2 className="text-center text-h2 font-bold text-text-primary">
            Add it to Claude, step by step
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-text-muted">
            Four steps inside Claude&apos;s web or desktop app. Here&apos;s
            exactly what each screen looks like.
          </p>

          <div className="mt-10 flex flex-col gap-8">
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="grid items-center gap-6 md:grid-cols-2"
              >
                {/* Screenshot */}
                <div
                  className={i % 2 === 1 ? "md:order-2" : undefined}
                >
                  <div className="overflow-hidden rounded-xl border border-border bg-bg-tertiary shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                    <Image
                      src={step.image}
                      alt={step.imageAlt}
                      width={760}
                      height={460}
                      unoptimized
                      className="h-auto w-full"
                    />
                  </div>
                </div>
                {/* Text */}
                <div className={i % 2 === 1 ? "md:order-1" : undefined}>
                  <span className="font-accent text-3xl font-bold text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 text-h3 font-semibold text-text-primary">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Connector details */}
        <section className="py-10 md:py-14">
          <div className="rounded-2xl border border-gold-dim bg-gold/5 p-6 md:p-8">
            <h2 className="text-h3 font-bold text-text-primary">
              Connector details
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Copy these into the dialog Claude shows you.
            </p>

            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <CopyRow label="Suggested name" value={connectorName} />
              <CopyRow label={urlLabel} value={mcpUrl} />
            </div>

            <div className="mt-6 border-t border-border pt-5">
              <CopyRow
                label="Prefer Claude Code? Run this"
                value={claudeCodeCommand}
                multiline
              />
              {claudeCodeNote && (
                <p className="mt-2 text-xs text-text-dim">{claudeCodeNote}</p>
              )}
            </div>
          </div>
        </section>

        {/* What you can ask — the free toolset */}
        <section className="py-10">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-gold" aria-hidden="true" />
            <h2 className="text-h2 font-bold text-text-primary">{asksTitle}</h2>
          </div>
          <p className="mt-2 max-w-2xl text-text-muted">{asksLede}</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {asks.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-border bg-bg-secondary p-5"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-text-primary">
                    {item.title}
                  </h3>
                  <span className="rounded bg-gold/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
                    Free
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-gold-light">
                  &ldquo;{item.ask}&rdquo;
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          {advanced && (
            <div className="mt-6 flex flex-col gap-3 rounded-xl border border-blue/30 bg-blue/5 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <Sparkles
                  className="mt-0.5 h-5 w-5 shrink-0 text-blue"
                  aria-hidden="true"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-text-primary">
                      {advanced.name}
                    </h3>
                    <span className="rounded bg-blue/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue">
                      Advanced
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">
                    {advanced.blurb}
                  </p>
                </div>
              </div>
              <span className="shrink-0 font-accent text-sm font-semibold text-blue">
                {advanced.price}
              </span>
            </div>
          )}
        </section>

        {/* Closing */}
        <section className="py-12 md:py-16">
          <div className="mx-auto max-w-3xl rounded-xl border border-border bg-bg-secondary p-8 text-center">
            <h2 className="text-h2 font-bold text-text-primary">
              {closingTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-text-muted">
              {closingBody}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/free-tools"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border px-6 font-medium text-text-primary transition-colors hover:border-gold-dim hover:text-gold sm:w-auto"
              >
                Browse all free tools
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="/consulting#booking"
                className="flex h-12 w-full items-center justify-center rounded-lg bg-gold px-6 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] sm:w-auto"
              >
                Book a call
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
