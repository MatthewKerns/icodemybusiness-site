"use client";

import dynamic from "next/dynamic";
import { Sparkles } from "lucide-react";

// Anonymous-friendly: the intake chat is free, no account required. Account
// creation + submission happen later, from inside the chat once it has enough
// context. Loaded client-only (it owns an SSE stream + local state).
const EcommerceIntakeAgent = dynamic(
  () =>
    import("@/components/agent/ecommerce/EcommerceIntakeAgent").then(
      (m) => m.EcommerceIntakeAgent
    ),
  { ssr: false }
);

export default function CustomToolsPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen bg-bg-primary px-4 py-12 md:px-6 lg:px-12"
    >
      <div className="mx-auto max-w-3xl py-8 lg:py-12">
        <section className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gold/10">
            <Sparkles className="h-6 w-6 text-gold" aria-hidden="true" />
          </div>
          <h1 className="text-h1 font-bold text-text-primary">
            Custom E-Commerce Tools Set
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-text-muted">
            A bespoke set of AI automations built for your store. Have a quick,
            free chat about where you&apos;re losing time — we scope and build
            your tools in the background, then email you the opportunities. No
            account needed to start.
          </p>
        </section>

        <section className="mt-10">
          <EcommerceIntakeAgent />
        </section>

        <p className="mt-4 text-center text-xs text-text-muted">
          Free to chat. Free to apply. Setting up an account just lets us send
          you your results and follow up with next steps.
        </p>
      </div>
    </main>
  );
}
