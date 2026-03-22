import { cn } from "@/lib/utils";
import { TestimonialCard } from "./TestimonialCard";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  rating?: number;
}

interface TestimonialSectionProps {
  testimonials?: Testimonial[];
  variant?: "strip" | "stack";
}

export function TestimonialSection({
  testimonials,
  variant = "strip",
}: TestimonialSectionProps) {
  // Placeholder variant when no testimonials exist
  if (!testimonials || testimonials.length === 0) {
    return (
      <section className="py-12 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl border border-border bg-bg-secondary p-8 text-center">
            <p className="text-sm text-text-dim">
              Client testimonials coming soon.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-center text-h2 font-bold text-text-primary">
          What clients say
        </h2>
        <div
          className={cn(
            "mt-8",
            variant === "strip"
              ? "flex flex-col gap-4 md:flex-row md:divide-x md:divide-border"
              : "flex flex-col gap-4"
          )}
        >
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.author}
              className={cn(
                variant === "strip" &&
                  "flex-1 md:px-4 first:md:pl-0 last:md:pr-0"
              )}
            >
              <TestimonialCard testimonial={testimonial} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
