"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import { CheckCircle, Loader2 } from "lucide-react";

export default function SubscriptionSuccessPage() {
  const { user, isLoaded } = useUser();
  const subscription = useQuery(
    api.subscriptions.getActiveSubscription,
    user?.id ? { userId: user.id } : "skip"
  );

  const isLoading = !isLoaded || subscription === undefined;
  const hasSubscription = !!subscription;

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg-primary px-4">
      <div className="mx-auto max-w-lg text-center">
        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-gold" />
            <p className="text-lg text-text-muted">
              Confirming your subscription...
            </p>
          </div>
        ) : hasSubscription ? (
          <div className="flex flex-col items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
              <CheckCircle className="h-10 w-10 text-success" />
            </div>
            <h1 className="text-h1 font-bold text-text-primary">
              Welcome aboard!
            </h1>
            <p className="text-lg text-text-muted">
              Your{" "}
              <span className="font-semibold capitalize text-gold">
                {subscription.plan}
              </span>{" "}
              subscription is now active.
            </p>

            <div className="mt-4 w-full rounded-xl border border-border bg-bg-secondary p-6 text-left">
              <h2 className="text-lg font-semibold text-text-primary">
                Next steps
              </h2>
              <ul className="mt-3 flex flex-col gap-3 text-sm text-text-muted">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-gold">1.</span>
                  Check your email for a confirmation receipt
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-gold">2.</span>
                  Join the community on Skool for live support
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 text-gold">3.</span>
                  Book your first coaching call if included in your plan
                </li>
              </ul>
            </div>

            <div className="mt-2 flex gap-4">
              <Link
                href="/"
                className="rounded-lg border border-border px-6 py-3 text-sm font-medium text-text-primary transition-colors hover:border-gold-dim hover:text-gold"
              >
                Go Home
              </Link>
              <Link
                href="/subscribe"
                className="rounded-lg bg-gold px-6 py-3 text-sm font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
              >
                View Plans
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-lg text-text-muted">
              We couldn&apos;t find an active subscription. It may take a moment
              to process.
            </p>
            <Link
              href="/subscribe"
              className="rounded-lg bg-gold px-6 py-3 text-sm font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              Back to Plans
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
