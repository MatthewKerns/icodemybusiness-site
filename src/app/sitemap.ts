import type { MetadataRoute } from "next";

const BASE = "https://icodemybusiness.com";

/**
 * The public marketing pages, and only those: no /admin, no /portal, no
 * /forbidden, and nothing that needs a sign-in. Submitting a gated URL earns a
 * Search Console warning and tells a scanner the opposite of what we want.
 */
const PUBLIC_PATHS = [
  "/",
  "/about",
  "/academy",
  "/assessment",
  "/book",
  "/connect",
  "/consulting",
  "/custom-tools",
  "/free-tools",
  "/mango",
  "/privacy",
  "/services",
  "/terms",
] as const;

// Deliberately absent: /testimonials. It is a draft that 404s unless
// NEXT_PUBLIC_ENABLE_TESTIMONIALS_DRAFT is "true", and even when enabled the
// page sets robots index:false — so it must never be advertised here. A sitemap
// entry that answers 404 is exactly what a trust review notices.

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PUBLIC_PATHS.map((path) => ({
    url: `${BASE}${path}`,
    lastModified,
  }));
}
