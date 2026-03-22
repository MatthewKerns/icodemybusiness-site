import { cn } from "@/lib/utils";
import { FileText, Video, MessageSquare, Cpu, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BonusItem {
  icon: LucideIcon;
  title: string;
  description: string;
  value: string;
}

const BONUSES: BonusItem[] = [
  {
    icon: FileText,
    title: "Custom Research Brief",
    description:
      "2-3 hours of deep research into your business, competitors, and AI opportunities — delivered before we even meet.",
    value: "$200 value",
  },
  {
    icon: Users,
    title: "Live Strategy Session",
    description:
      "A focused, recorded call where we map your workflows and build your automation blueprint together.",
    value: "$150 value",
  },
  {
    icon: Video,
    title: "Loom Recording",
    description:
      "A full walkthrough recording of everything we cover so you can replay and share with your team.",
    value: "$100 value",
  },
  {
    icon: MessageSquare,
    title: "30-Day Follow-up Access",
    description:
      "Direct access to me for 30 days after our session for questions, tweaks, and troubleshooting.",
    value: "$200 value",
  },
  {
    icon: Cpu,
    title: "Custom Claude Project",
    description:
      "A pre-built Claude project configured for your specific business use case, ready to use day one.",
    value: "$150 value",
  },
];

export function BonusStack() {
  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-h2 font-bold text-text-primary">
          Everything you get
        </h2>
        <p className="mt-2 text-center text-text-muted">
          Over <span className="font-semibold text-gold">$800 in value</span>{" "}
          included with every session
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
              <div className="flex items-start justify-between">
                <bonus.icon className="h-6 w-6 text-gold" />
                <span className="font-accent text-sm font-medium text-gold-dim">
                  {bonus.value}
                </span>
              </div>
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
