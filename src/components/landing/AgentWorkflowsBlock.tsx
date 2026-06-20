import { Workflow, Database, Bot } from "lucide-react";

export function AgentWorkflowsBlock() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <div className="mb-10 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">
          How we build
        </p>
        <h2 className="mt-2 text-h2 font-bold text-text-primary">
          Modern software runs on agent workflows
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-text-muted">
          We put chat agents next to the data you already oversee — so the work
          to understand it, decide on it, and execute next steps happens in one
          place instead of five tabs.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Pillar
          icon={<Database className="h-5 w-5 text-gold" />}
          title="Agents live with your data"
          body="Every dashboard, ledger, and admin screen gets a side-car agent that knows the data in context."
        />
        <Pillar
          icon={<Bot className="h-5 w-5 text-gold" />}
          title="They know your job"
          body="We prompt agents with the same runbooks your team uses, so they ask the right follow-ups, not generic ones."
        />
        <Pillar
          icon={<Workflow className="h-5 w-5 text-gold" />}
          title="They move work forward"
          body="Agents draft artifacts — summaries, tickets, outreach, emails — and hand back a reviewable result, not a pile of tokens."
        />
      </div>
    </section>
  );
}

function Pillar({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-5 transition-colors hover:border-gold/30">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-gold/10">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mt-1 text-sm text-text-muted">{body}</p>
    </div>
  );
}
