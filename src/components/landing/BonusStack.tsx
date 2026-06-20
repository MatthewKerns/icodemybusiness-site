import { cn } from "@/lib/utils";
import { FileText, Video, MessageSquare, Cpu, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BonusItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const BONUSES: BonusItem[] = [
  {
    icon: FileText,
    title: "Custom Research Brief",
    description:
      "2-3 hours of deep research into your business, competitors, and AI opportunities — delivered before we even meet.",
  },
  {
    icon: Users,
    title: "Live Strategy Session",
    description:
      "A focused, recorded call where we map your workflows and build your automation blueprint together.",
  },
  {
    icon: Video,
    title: "Loom Recording",
    description:
      "A full walkthrough recording of everything we cover so you can replay and share with your team.",
  },
  {
    icon: MessageSquare,
    title: "30-Day Follow-up Access",
    description:
      "Direct access to me for 30 days after our session for questions, tweaks, and troubleshooting.",
  },
  {
    icon: Cpu,
    title: "Custom Claude Project",
    description:
      "A pre-built Claude project configured for your specific business use case, ready to use day one.",
  },
];

export function BonusStack() {
  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-h2 font-bold text-text-primary">
          What you get in a paid engagement
        </h2>
        <p className="mt-2 text-center text-text-muted">
          Everything included when we move from the free consultation into
          building your system
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BONUSES.map((bonus) => (
            <div
              key={bonus.title}
              className={cn(
                "group rounded-xl border border-border bg-bg-secondary p-6",
                "transition-all duration-300 hover:border-gold-dim hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]"
              )}
            >
              <bonus.icon className="h-6 w-6 text-gold" />
              <h3 className="mt-4 text-h3 font-semibold text-text-primary">
                {bonus.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-muted">
                {bonus.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
