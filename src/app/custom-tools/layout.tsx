import type { Metadata } from "next";

/**
 * Metadata for /custom-tools — in a layout because the page is a Client
 * Component. See src/app/free-tools/layout.tsx for the reasoning.
 */
export const metadata: Metadata = {
  title: "Custom E-Commerce Tools | iCodeMyBusiness",
  description:
    "A bespoke set of AI automations built for your store, scoped from a short conversation about where you are losing time.",
  openGraph: {
    title: "Custom E-Commerce Tools | iCodeMyBusiness",
    description:
      "A bespoke set of AI automations built for your store, scoped from a short conversation about where you are losing time.",
    type: "website",
  },
};

export default function CustomToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
