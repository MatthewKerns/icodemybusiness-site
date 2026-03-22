import { PricingTier } from "@/components/landing/PricingTier";
import { EmailCapture } from "@/components/shared/EmailCapture";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { CommunityBanner } from "@/components/landing/CommunityBanner";

const TIERS = [
  {
    name: "Starter",
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
          {TIERS.map((tier) => (
            <PricingTier key={tier.name} {...tier} />
          ))}
        </div>
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
    </main>
  );
}
