import { cn } from "@/lib/utils";

interface CommunityBannerProps {
  className?: string;
}

export function CommunityBanner({ className }: CommunityBannerProps) {
  return (
    <section className={cn("py-12 lg:py-16", className)}>
      <div className="mx-auto max-w-2xl rounded-xl border border-gold-dim bg-bg-secondary p-8 text-center">
        <h3 className="text-h3 font-bold text-text-primary">
          Join the Inner Circle
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Connect with other business owners using AI to grow. Share wins,
          get feedback, and access exclusive content.
        </p>
        <a
          href="https://www.skool.com/icodemybusiness"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex h-12 items-center gap-2 rounded-lg bg-gold px-6 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          Join on Skool
          <span aria-hidden="true">&rarr;</span>
        </a>
      </div>
    </section>
  );
}
