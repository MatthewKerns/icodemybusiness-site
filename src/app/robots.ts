import type { MetadataRoute } from "next";

/**
 * robots.txt for the public marketing site.
 *
 * The apex served no robots.txt at all until 2026-09-17 (it 404'd), which — next
 * to a sign-in flow and no policy pages — is part of what makes an automated
 * reputation scanner treat a domain as unverifiable. See docs/trust-pages.md.
 *
 * Staging is handled separately in src/middleware.ts: that host answers every
 * page, robots.txt included, with a bare 404 (src/lib/staging-host.ts).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin", "/forbidden", "/portal", "/sign-in", "/sign-up"],
      },
    ],
    sitemap: "https://icodemybusiness.com/sitemap.xml",
    host: "https://icodemybusiness.com",
  };
}
