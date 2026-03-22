import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  rating?: number;
}

interface TestimonialCardProps {
  testimonial: Testimonial;
}

export function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const { quote, author, role, rating = 5 } = testimonial;

  return (
    <blockquote className="rounded-xl border border-border bg-bg-secondary p-6">
      <div
        className="flex gap-0.5"
        aria-label={`${rating} out of 5 stars`}
        role="img"
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              i < rating ? "fill-gold text-gold" : "fill-none text-text-dim"
            )}
          />
        ))}
      </div>
      <p className="mt-3 text-sm italic leading-relaxed text-text-muted">
        &ldquo;{quote}&rdquo;
      </p>
      <footer className="mt-4">
        <p className="text-sm font-medium text-text-primary">{author}</p>
        <p className="text-xs text-text-dim">{role}</p>
      </footer>
    </blockquote>
  );
}
