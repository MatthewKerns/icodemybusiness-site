"use client";

import { useCallback } from "react";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStripePromise } from "@/lib/stripe-client";
import { StripeErrorBoundary } from "@/components/shared/StripeErrorBoundary";
import { CreditCard, Mail } from "lucide-react";

interface EmbeddedCheckoutDialogProps {
  plan: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Core EmbeddedCheckoutDialog component (unwrapped)
 * Exported for testing and cases where error boundaries are not needed
 */
export function EmbeddedCheckoutDialogCore({
  plan,
  open,
  onOpenChange,
}: EmbeddedCheckoutDialogProps) {
  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (!res.ok) {
      throw new Error("Failed to create checkout session");
    }
    const data = await res.json();
    return data.clientSecret as string;
  }, [plan]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-bg-secondary p-0 sm:max-w-2xl [&>button]:text-text-muted">
        <DialogTitle className="sr-only">Checkout</DialogTitle>
        {plan && (
          <div className="max-h-[80vh] overflow-y-auto p-1">
            <EmbeddedCheckoutProvider
              stripe={getStripePromise()}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * EmbeddedCheckoutDialog wrapped with StripeErrorBoundary
 * Provides graceful error handling for Stripe payment component failures
 * with custom fallback UI that includes contact/support information
 */
export function EmbeddedCheckoutDialog({
  plan,
  open,
  onOpenChange,
}: EmbeddedCheckoutDialogProps) {
  // Custom fallback for Stripe errors in checkout dialog
  const stripeFallback = (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl border-border bg-bg-secondary sm:max-w-2xl [&>button]:text-text-muted">
        <DialogTitle className="sr-only">Checkout Error</DialogTitle>
        <div className="flex min-h-[400px] flex-col items-center justify-center px-6 py-12 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
            <CreditCard className="h-6 w-6 text-error" />
          </div>
          <h3 className="text-xl font-semibold text-text-primary">
            Payment System Unavailable
          </h3>
          <p className="mt-3 max-w-md text-sm text-text-muted">
            We&apos;re having trouble loading the payment system right now. This is usually temporary.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-2 rounded-lg bg-gold px-6 py-3 font-medium text-black transition-shadow hover:shadow-[0_0_20px_rgba(212,175,55,0.3)]"
            >
              Try Again Later
            </button>
            <a
              href="mailto:support@icodemybusiness.com?subject=Payment%20Issue"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 font-medium text-text-muted transition-colors hover:border-gold-dim hover:text-gold"
            >
              <Mail className="h-4 w-4" />
              Contact Support
            </a>
          </div>
          <p className="mt-6 text-xs text-text-dim">
            We&apos;ll help you get set up manually if this persists
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <StripeErrorBoundary fallback={stripeFallback}>
      <EmbeddedCheckoutDialogCore
        plan={plan}
        open={open}
        onOpenChange={onOpenChange}
      />
    </StripeErrorBoundary>
  );
}
