import type { Metadata } from "next";

/**
 * Metadata for /free-tools.
 *
 * It lives in a layout rather than the page because the page is a Client
 * Component, and `export const metadata` is only honoured in Server Components.
 * Without this the route inherited the root layout's generic title, so it was
 * indistinguishable from every other page in search results and link previews.
 */
export const metadata: Metadata = {
  title: "Free AI Tools | iCodeMyBusiness",
  description:
    "Open dev skills and a GitHub best-practices repo, free to use today. No credit card, no catch.",
  openGraph: {
    title: "Free AI Tools | iCodeMyBusiness",
    description:
      "Open dev skills and a GitHub best-practices repo, free to use today. No credit card, no catch.",
    type: "website",
  },
};

export default function FreeToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
