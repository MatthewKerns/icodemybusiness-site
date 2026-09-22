import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, EB_Garamond } from "next/font/google";
import { Providers } from "@/components/shared/Providers";
import { NavBar } from "@/components/landing/NavBar";
import { Footer } from "@/components/landing/Footer";
import { organizationJsonLd } from "@/lib/business";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

// Display/heading serif (body stays Inter)
const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-eb-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute URLs in metadata (Open Graph, canonical links pages set) resolve
  // against the apex. Deliberately NO `alternates.canonical` here: every page
  // inherits root metadata, so a canonical of "/" would declare every page a
  // copy of the homepage.
  metadataBase: new URL("https://icodemybusiness.com"),
  title: "iCodeMyBusiness",
  description:
    "Save time. Make more money. AI-powered consulting and automation tools for business owners.",
  openGraph: {
    title: "iCodeMyBusiness",
    description:
      "Save time. Make more money. AI-powered consulting and automation tools for business owners.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${jetbrainsMono.variable} ${ebGaramond.variable}`}
    >
      <body>
        {/* Machine-readable identity for reviewers and crawlers; same source as the footer. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <Providers>
          <NavBar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
