"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg-primary px-4 text-center">
      <p className="font-accent text-6xl font-bold text-error">!</p>
      <h1 className="mt-4 text-h2 font-bold text-text-primary">
        Something went wrong
      </h1>
      <p className="mt-2 text-text-muted">
        An unexpected error occurred. Please try again.
      </p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={reset}
          className="rounded-lg bg-gold px-6 py-3 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-border px-6 py-3 font-medium text-text-primary transition-colors hover:border-blue"
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
