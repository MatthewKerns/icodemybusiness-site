import Link from "next/link";
import { CopyRow } from "@/components/shared/CopyRow";
import {
  Plug,
  Settings,
  PlusCircle,
  ClipboardPaste,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

export interface ConnectorStep {
  title: string;
  body: string;
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
  /** Label for the URL field — e.g. "Connector link" (founder) or "Remote MCP server URL" (builder). */
  urlLabel: string;
  /** Slug used in the Claude Code CLI command. */
  claudeCodeId: string;
  /** The four-step walkthrough, in order. */
  steps: ConnectorStep[];
  /** Reassurance line shown beside the connector details (e.g. "No login required"). */
  noLoginNote: string;
  /** Closing card heading. */
  closingTitle: string;
  /** Closing card body. */
  closingBody: string;
}

const STEP_ICONS = [Settings, PlusCircle, ClipboardPaste, CheckCircle2] as const;

/** A stylized mockup of Claude's "Add custom connector" dialog. */
function ConnectorDialogMock({
  connectorName,
  mcpUrl,
}: {
  connectorName: string;
  mcpUrl: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="rounded-2xl border border-border bg-bg-tertiary p-5 shadow-[0_24px_70px_rgba(0,0,0,0.55)] sm:p-6"
    >
      <p className="text-base font-bold text-text-primary">Add custom connector</p>
      <p className="mt-0.5 text-xs text-text-muted">
        Connect any MCP server by URL.
      </p>

      <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
          Name
        </p>
        <div className="mt-1 rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm font-medium text-text-primary">
          {connectorName}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-dim">
          Remote MCP server URL
        </p>
        <div className="mt-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border-2 border-gold bg-bg-primary px-3 py-2 font-accent text-xs text-text-primary">
          {mcpUrl}
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <div className="rounded-lg bg-bg-secondary px-4 py-2 text-xs font-semibold text-text-muted">
          Cancel
        </div>
        <div className="rounded-lg bg-gold px-5 py-2 text-xs font-bold text-black">
          Add
        </div>
      </div>
    </div>
  );
}

export function ConnectorSetup({
  eyebrow,
  title,
  intro,
  connectorName,
  mcpUrl,
  urlLabel,
  claudeCodeId,
  steps,
  noLoginNote,
  closingTitle,
  closingBody,
}: ConnectorSetupProps) {
  const cliCommand = `claude mcp add --transport http ${claudeCodeId} ${mcpUrl}`;

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
              {noLoginNote}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="pb-8">
          <div className="grid gap-5 md:grid-cols-2">
            {steps.map((step, i) => {
              const Icon = STEP_ICONS[i] ?? CheckCircle2;
              return (
                <div
                  key={step.title}
                  className="flex gap-4 rounded-xl border border-border bg-bg-secondary p-6"
                >
                  <div className="flex shrink-0 flex-col items-center gap-3">
                    <span className="font-accent text-2xl font-bold text-gold">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <Icon
                      className="h-5 w-5 text-text-dim"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h2 className="text-h3 font-semibold text-text-primary">
                      {step.title}
                    </h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                      {step.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Connector details + dialog mockup */}
        <section className="py-10 md:py-14">
          <div className="grid items-start gap-8 md:grid-cols-2">
            <div className="rounded-2xl border border-gold-dim bg-gold/5 p-6 md:p-8">
              <h2 className="text-h3 font-bold text-text-primary">
                Connector details
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Copy these into the dialog Claude shows you.
              </p>

              <div className="mt-6 flex flex-col gap-5">
                <CopyRow label="Suggested name" value={connectorName} />
                <CopyRow label={urlLabel} value={mcpUrl} />
              </div>

              <div className="mt-6 border-t border-border pt-5">
                <CopyRow label="Prefer Claude Code? Run this" value={cliCommand} />
              </div>
            </div>

            <div>
              <ConnectorDialogMock
                connectorName={connectorName}
                mcpUrl={mcpUrl}
              />
              <p className="mt-3 text-center text-xs text-text-dim">
                This is the dialog you&apos;ll see inside Claude.
              </p>
            </div>
          </div>
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
