import Link from "next/link";
import { CopyRow } from "@/components/shared/CopyRow";
import {
  Terminal,
  GitBranch,
  Package,
  Plug,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const TOOLS = [
  {
    name: "get_best_practice",
    blurb: "Search the guide by topic and get the best-matching doc back.",
  },
  {
    name: "read_guide",
    blurb: "Read any specific reference doc by its path.",
  },
  {
    name: "list_patterns",
    blurb: "Discover every section, skill, agent, and checklist available.",
  },
  {
    name: "get_checklist",
    blurb: "Pull a quick-reference checklist (code review, SOLID, TDD…).",
  },
  {
    name: "scaffold_agents_md",
    blurb: "Generate the AGENTS.md template for a repo.",
  },
  {
    name: "validate_flag_registry",
    blurb: "Lint a feature-flag registry against the guide's rules.",
  },
] as const;

const DESKTOP_CONFIG = `{
  "mcpServers": {
    "software-builder-tools": {
      "command": "node",
      "args": [
        "/absolute/path/to/software-development-best-practices-guide/mcp/server.mjs"
      ]
    }
  }
}`;

const STEPS = [
  {
    icon: GitBranch,
    title: "Clone the repo",
    body: "Grab the open-source guide + MCP server from GitHub (MIT licensed).",
    copy: {
      label: "Terminal",
      value:
        "git clone https://github.com/MatthewKerns/software-development-best-practices-guide.git",
    },
  },
  {
    icon: Package,
    title: "Install dependencies",
    body: "Step into the folder and install — just three small packages.",
    copy: {
      label: "Terminal",
      value:
        "cd software-development-best-practices-guide && npm install",
    },
  },
  {
    icon: Plug,
    title: "Add it to Claude Code",
    body: "Register the server over stdio. Run this from inside the cloned folder so the path resolves automatically.",
    copy: {
      label: "Terminal",
      value:
        'claude mcp add software-builder-tools -- node "$(pwd)/mcp/server.mjs"',
    },
  },
  {
    icon: CheckCircle2,
    title: "Verify it's connected",
    body: "Confirm the server is registered. After restarting Claude, its tools are available in any chat.",
    copy: {
      label: "Terminal",
      value: "claude mcp list",
    },
  },
] as const;

export function LocalMcpInstall() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-bg-primary px-4 md:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-3xl">
        {/* Hero */}
        <section className="py-16 md:py-20">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold-dim bg-gold/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-gold">
              <Terminal className="h-3.5 w-3.5" aria-hidden="true" />
              Free local MCP server
            </span>
            <h1 className="mt-6 text-h1 font-bold leading-tight text-text-primary">
              Run the Software Builder Tools MCP
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-text-muted">
              My continuously-updated engineering best-practices guide —
              reference sections, skills, agents, and checklists — as callable
              tools inside Claude. It runs locally over stdio: clone the repo,
              point Claude at it, done.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-4 py-2 text-sm text-text-muted">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
              Open source (MIT) · needs Node 18+ and git · about 2 minutes
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="flex flex-col gap-5 pb-4">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="rounded-xl border border-border bg-bg-secondary p-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex shrink-0 flex-col items-center gap-3">
                  <span className="font-accent text-2xl font-bold text-gold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <step.icon
                    className="h-5 w-5 text-text-dim"
                    aria-hidden="true"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-h3 font-semibold text-text-primary">
                    {step.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                    {step.body}
                  </p>
                  <div className="mt-4">
                    <CopyRow label={step.copy.label} value={step.copy.value} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* Claude Desktop alternative */}
        <section className="py-6">
          <div className="rounded-xl border border-border bg-bg-secondary p-6">
            <h2 className="text-h3 font-semibold text-text-primary">
              Using Claude Desktop instead?
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
              Add this to your{" "}
              <code className="rounded bg-bg-tertiary px-1 py-0.5 font-accent text-xs text-gold">
                claude_desktop_config.json
              </code>{" "}
              (swap in the absolute path to where you cloned the repo), then
              restart Claude Desktop.
            </p>
            <div className="mt-4">
              <CopyRow
                label="claude_desktop_config.json"
                value={DESKTOP_CONFIG}
                multiline
              />
            </div>
          </div>
        </section>

        {/* What you get */}
        <section className="py-10">
          <h2 className="text-h2 font-bold text-text-primary">
            What you get
          </h2>
          <p className="mt-2 text-text-muted">
            Six tools that read straight from the guide — so the answers reflect
            the latest version, not a snapshot.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {TOOLS.map((tool) => (
              <div
                key={tool.name}
                className="rounded-xl border border-border bg-bg-secondary p-5"
              >
                <code className="font-accent text-sm font-semibold text-gold-light">
                  {tool.name}
                </code>
                <p className="mt-1.5 text-sm leading-relaxed text-text-muted">
                  {tool.blurb}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Closing */}
        <section className="py-12 md:py-16">
          <div className="rounded-xl border border-border bg-bg-secondary p-8 text-center">
            <h2 className="text-h2 font-bold text-text-primary">
              Always current, by design
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-text-muted">
              The guide behind this server is the same one I maintain and update
              as my own practices evolve — pull the repo to get the latest. A
              one-click hosted connector is on the way; for now this local setup
              gives you the full toolset.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/free-tools"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-border px-6 font-medium text-text-primary transition-colors hover:border-gold-dim hover:text-gold sm:w-auto"
              >
                Browse all free tools
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="https://github.com/MatthewKerns/software-development-best-practices-guide"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-12 w-full items-center justify-center rounded-lg bg-gold px-6 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] sm:w-auto"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
