"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
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
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-bg-secondary px-4 text-center text-white">
        <p className="text-6xl font-bold text-error">!</p>
        <h1 className="mt-4 text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-text-dim">
          A critical error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="mt-8 rounded-lg bg-gold px-6 py-3 font-medium text-black"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
