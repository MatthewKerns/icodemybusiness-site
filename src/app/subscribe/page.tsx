"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PricingTier } from "@/components/landing/PricingTier";
import { EmailCapture } from "@/components/shared/EmailCapture";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { CommunityBanner } from "@/components/landing/CommunityBanner";
import { EmbeddedCheckoutDialog } from "@/components/subscribe/EmbeddedCheckoutDialog";
import { CreditCard } from "lucide-react";

const TIERS = [
  {
    name: "Starter",
    plan: "starter",
    price: "$19.99",
    description: "Get started with AI workflows",
    features: [
      "3 Claude Project Packs monthly",
      "Basic workflow templates",
      "Community access",
      "Email support",
    ],
  },
  {
    name: "Pro",
    plan: "pro",
    price: "$34.99",
    description: "Scale your AI-powered business",
    recommended: true,
    features: [
      "Everything in Starter",
      "10 Claude Project Packs monthly",
      "Advanced automation templates",
      "Priority support",
      "Monthly group coaching call",
    ],
  },
  {
    name: "Enterprise",
    plan: "enterprise",
    price: "$49.99",
    description: "Full-service AI transformation",
    features: [
      "Everything in Pro",
      "Unlimited Claude Project Packs",
      "Custom workflow builds",
      "1-on-1 monthly strategy call",
      "Early access to new tools",
    ],
  },
];

const FAQ_ITEMS = [
  {
    question: "What are Claude Project Packs?",
    answer:
      "Pre-built AI skill configurations for Claude that automate specific business tasks. Each pack includes prompts, workflows, and instructions you can load directly into Claude to handle things like content creation, client communication, data analysis, and more.",
  },
  {
    question: "Can I switch plans?",
    answer:
      "Yes, upgrade or downgrade anytime. Changes take effect next billing cycle.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Enter your email to get 3 free Claude Project Packs immediately — no credit card required.",
  },
  {
    question: "What's included in group coaching?",
    answer:
      "Monthly live sessions where I walk through new AI tools, answer questions, and share automation strategies.",
  },
];

export default function SubscriptionsPage() {
  const router = useRouter();
  const { user, isSignedIn } = useUser();
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  const subscription = useQuery(
    api.subscriptions.getActiveSubscription,
    user?.id ? { userId: user.id } : "skip"
  );

  const handleManageBilling = useCallback(async () => {
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      window.location.href = url;
    }
  }, []);

  const handleTierClick = useCallback(
    (plan: string) => {
      if (!isSignedIn) {
        router.push("/sign-in?redirect_url=/subscribe");
        return;
      }
      if (subscription?.plan === plan || subscription) {
        void handleManageBilling();
        return;
      }
      setCheckoutPlan(plan);
    },
    [isSignedIn, subscription, router, handleManageBilling]
  );

  return (
    <main
      id="main-content"
      className="min-h-screen bg-bg-primary px-4 py-12 md:px-6 lg:px-12"
    >
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl py-12 lg:py-20">
        <h1 className="text-h1 font-bold text-text-primary">
          AI Workflows That Work While You Sleep
        </h1>
        <p className="mt-4 max-w-2xl text-text-muted">
          Stop spending hours on repetitive tasks. Our Claude Project Packs give
          you plug-and-play AI automations that handle the busywork — so you can
          focus on growing your business.
        </p>
      </section>

      {/* Pricing Tiers */}
      <section className="mx-auto max-w-7xl py-12 lg:py-20">
        <div className="grid gap-8 md:grid-cols-3">
          {TIERS.map((tier) => {
            const isCurrentPlan =
              subscription?.status === "active" &&
              subscription?.plan === tier.plan;

            return (
              <div key={tier.name} className="relative">
                {isCurrentPlan && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                    <span className="rounded-full border border-success bg-success/10 px-3 py-1 text-xs font-medium text-success">
                      Current Plan
                    </span>
                  </div>
                )}
                <PricingTier
                  {...tier}
                  ctaLabel={
                    isCurrentPlan
                      ? "Manage Billing"
                      : subscription
                        ? "Switch Plan"
                        : "Get Started"
                  }
                  onCtaClick={() => handleTierClick(tier.plan)}
                />
              </div>
            );
          })}
        </div>

        {subscription && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => void handleManageBilling()}
              className="flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-text-muted transition-colors hover:border-gold-dim hover:text-gold"
            >
              <CreditCard className="h-4 w-4" />
              Manage Billing &amp; Invoices
            </button>
          </div>
        )}
      </section>

      {/* Email Capture */}
      <section id="email-capture" className="mx-auto max-w-7xl py-12 lg:py-20">
        <EmailCapture
          source="subscribe"
          headline="Get 3 free Claude Project Packs"
          subtitle="Enter your email for immediate access. No credit card required."
        />
      </section>

      {/* Community */}
      <div className="mx-auto max-w-7xl">
        <CommunityBanner />
      </div>

      {/* FAQ */}
      <section className="mx-auto max-w-7xl py-12 lg:py-20">
        <h2 className="text-h2 font-bold text-text-primary">
          Frequently Asked Questions
        </h2>
        <div className="mt-8">
          <FAQAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* Checkout Dialog */}
      <EmbeddedCheckoutDialog
        plan={checkoutPlan}
        open={!!checkoutPlan}
        onOpenChange={(open) => {
          if (!open) setCheckoutPlan(null);
        }}
      />
    </main>
  );
}
