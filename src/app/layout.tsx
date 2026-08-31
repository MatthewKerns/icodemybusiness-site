import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, EB_Garamond } from "next/font/google";
import { Providers } from "@/components/shared/Providers";
import { NavBar } from "@/components/landing/NavBar";
import { Footer } from "@/components/landing/Footer";

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

const SITE_DESCRIPTION =
  "A developer academy for founders who build their own software. Learn to ship the tools your business runs on — professionally.";

export const metadata: Metadata = {
  title: {
    default: "iCodeMyBusiness — Learn to Build Your Own Software",
    template: "%s | iCodeMyBusiness",
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "iCodeMyBusiness — Learn to Build Your Own Software",
    description: SITE_DESCRIPTION,
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
        <Providers>
          <NavBar />
          {children}
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
