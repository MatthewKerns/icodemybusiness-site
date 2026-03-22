import Link from "next/link";
import { cn } from "@/lib/utils";

interface OfferCardProps {
  icon: string;
  title: string;
  description: string;
  href: string;
}

export function OfferCard({ icon, title, description, href }: OfferCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col rounded-xl border border-border bg-bg-secondary p-5 transition-all",
        "hover:border-gold-dim hover:shadow-[0_0_20px_rgba(212,175,55,0.15)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-light focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      )}
    >
      <span className="text-2xl" role="img" aria-hidden="true">{icon}</span>
      <h3 className="mt-3 text-h3 font-semibold text-text-primary">{title}</h3>
      <p className="mt-1 flex-1 text-sm text-text-muted">{description}</p>
      <span className="mt-4 text-sm font-medium text-gold transition-colors group-hover:text-gold-light">
        Learn more &rarr;
      </span>
    </Link>
  );
}
