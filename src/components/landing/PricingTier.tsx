import { cn } from "@/lib/utils";
import Link from "next/link";
import { Check } from "lucide-react";

interface PricingTierProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  recommended?: boolean;
  ctaHref?: string;
  ctaLabel?: string;
}

export function PricingTier({
  name,
  price,
  description,
  features,
  recommended = false,
  ctaHref = "#email-capture",
  ctaLabel = "Get Started",
}: PricingTierProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border p-6 transition-all",
        recommended
          ? "border-gold bg-bg-secondary shadow-[0_0_30px_rgba(212,175,55,0.15)]"
          : "border-border bg-bg-secondary hover:border-gold-dim"
      )}
    >
      {recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-0.5 text-xs font-semibold text-black">
          Recommended
        </span>
      )}

      <h3 className="text-h3 font-bold text-text-primary">{name}</h3>
      <p className="mt-1 text-sm text-text-muted">{description}</p>

      <div className="mt-4">
        <span className="font-accent text-3xl font-bold text-gold">{price}</span>
        <span className="text-sm text-text-dim">/month</span>
      </div>

      <ul className="mt-6 flex flex-1 flex-col gap-2.5">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-text-muted">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={cn(
          "mt-6 flex h-12 items-center justify-center rounded-lg font-medium transition-shadow",
          recommended
            ? "bg-gold text-black hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            : "border border-border text-text-primary hover:border-gold-dim hover:text-gold"
        )}
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
