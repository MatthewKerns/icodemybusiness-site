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
import { ConvexErrorBoundary } from "@/components/shared/ConvexErrorBoundary";
import { CreditCard } from "lucide-react";

type Tier = {
  name: string;
  plan: string;
  price: string;
  description: string;
  features: string[];
  recommended?: boolean;
  comingSoon?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Personal Time Planner",
    plan: "personal",
    price: "$24.99",
    description: "For everyone — plan your day around what actually matters.",
    features: [
      "Goal-to-daily-plan workflow",
      "Stay-on-track nudges",
      "Continuously improved & supported",
      "Connect as an MCP server",
    ],
  },
  {
    name: "Side Gig / Contractor Time",
    plan: "contractor",
    price: "$24.99",
    description:
      "For builders & contractors — track billable work without the busywork.",
    recommended: true,
    features: [
      "Time across clients & projects",
      "Billable vs non-billable at a glance",
      "Contractor delivery tracking",
      "Continuously improved & supported",
    ],
  },
  {
    name: "Business Management (EOS)",
    plan: "business",
    price: "$49.99",
    description: "For founders — run your whole company on one operating system.",
    comingSoon: true,
    features: [
      "Scorecards, rocks & L10 agenda",
      "The EOS framework, fully supported",
      "Built on the personal + contractor tools",
    ],
  },
];

const FAQ_ITEMS = [
  {
    question: "What's the difference between the free and paid tools?",
    answer:
      "The free tools live in our GitHub best-practices repo — yours to use anytime. The paid tools are workflows I actively develop and improve all the time. That ongoing support is what makes them valuable: they keep getting better and stay reliable.",
  },
  {
    question: "Can I switch tools?",
    answer:
      "Yes, upgrade or switch anytime. Changes take effect the next billing cycle.",
  },
  {
    question: "When is Business Management (EOS) available?",
    answer:
      "It's coming soon. Drop your email below to join the waitlist and get early access when it launches.",
  },
  {
    question: "How do I use these?",
    answer:
      "Each tool connects to Claude as an MCP server — set up takes a couple of minutes. Once connected, the tool's workflow shows up as commands inside your AI client.",
  },
];

/**
 * Pricing section component that uses Convex subscription query.
 * Wrapped with ConvexErrorBoundary to gracefully degrade on query errors.
 */
function PricingSectionCore({
  onTierClick,
}: {
  onTierClick: (plan: string) => void;
}) {
  const { user, isSignedIn } = useUser();

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

  const handleTierClickInternal = useCallback(
    (plan: string) => {
      if (!isSignedIn) {
        onTierClick(plan);
        return;
      }
      if (subscription?.plan === plan || subscription) {
        void handleManageBilling();
        return;
      }
      onTierClick(plan);
    },
    [isSignedIn, subscription, onTierClick, handleManageBilling]
  );

  return (
    <>
      <div className="grid gap-8 md:grid-cols-3">
        {TIERS.map((tier) => {
          const isCurrentPlan =
            subscription?.status === "active" &&
            subscription?.plan === tier.plan;

          if (tier.comingSoon) {
            return (
              <div key={tier.name} className="relative">
                <PricingTier
                  {...tier}
                  ctaHref="#email-capture"
                  ctaLabel="Join the waitlist"
                />
              </div>
            );
          }

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
                onCtaClick={() => handleTierClickInternal(tier.plan)}
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
    </>
  );
}

/**
 * Pricing section wrapped with ConvexErrorBoundary.
 * Falls back to basic pricing tiers (no subscription status) if query fails.
 */
function PricingSection({ onTierClick }: { onTierClick: (plan: string) => void }) {
  // Fallback: Show pricing tiers without subscription status
  const fallback = (
    <div className="grid gap-8 md:grid-cols-3">
      {TIERS.map((tier) =>
        tier.comingSoon ? (
          <PricingTier
            key={tier.name}
            {...tier}
            ctaHref="#email-capture"
            ctaLabel="Join the waitlist"
          />
        ) : (
          <PricingTier
            key={tier.name}
            {...tier}
            ctaLabel="Get Started"
            onCtaClick={() => onTierClick(tier.plan)}
          />
        )
      )}
    </div>
  );

  return (
    <ConvexErrorBoundary fallback={fallback}>
      <PricingSectionCore onTierClick={onTierClick} />
    </ConvexErrorBoundary>
  );
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  const handleTierClick = useCallback(
    (plan: string) => {
      if (!isSignedIn) {
        router.push("/sign-in?redirect_url=/subscribe");
        return;
      }
      setCheckoutPlan(plan);
    },
    [isSignedIn, router]
  );

  return (
    <main
      id="main-content"
      className="min-h-screen bg-bg-primary px-4 py-12 md:px-6 lg:px-12"
    >
      {/* Hero Section */}
      <section className="mx-auto max-w-7xl py-12 lg:py-20">
        <h1 className="text-h1 font-bold text-text-primary">
          Tools I support, so they keep getting better
        </h1>
        <p className="mt-4 max-w-2xl text-text-muted">
          Unlike the free tools on GitHub, these are workflows I develop and
          improve constantly — heavily supported, always reliable. Pick the one
          that fits how you work.
        </p>
      </section>

      {/* Pricing Tiers */}
      <section className="mx-auto max-w-7xl py-12 lg:py-20">
        <PricingSection onTierClick={handleTierClick} />
      </section>

      {/* Email Capture */}
      <section id="email-capture" className="mx-auto max-w-7xl py-12 lg:py-20">
        <EmailCapture
          source="subscribe"
          headline="Join the Business Management (EOS) waitlist"
          subtitle="Be first to get EOS when it launches — plus updates as the tools improve."
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
