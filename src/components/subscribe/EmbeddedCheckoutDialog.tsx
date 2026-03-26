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

interface EmbeddedCheckoutDialogProps {
  plan: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmbeddedCheckoutDialog({
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
