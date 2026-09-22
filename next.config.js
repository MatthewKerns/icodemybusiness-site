const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
// Baseline security headers. A reputation engine scores their presence, and a
// domain under an ISP trust review cannot afford to serve none of them.
// HSTS deliberately starts SHORT and without includeSubDomains/preload: this
// domain co-hosts mango. and ideabrandcoach., and a long max-age would bind
// every subdomain in every browser that saw the header. Raise it only after
// confirming every *.icodemybusiness.com host is HTTPS-only.
const SECURITY_HEADERS = [
  { key: 'Strict-Transport-Security', value: 'max-age=300' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // microphone is intentionally NOT disabled — the Retell voice widget needs it
  // the day it is mounted. camera/geolocation/payment/topics are unused.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), geolocation=(), payment=(), browsing-topics=()',
  },
  // -allow-popups, not bare same-origin: Clerk OAuth popups need their opener.
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
];

const nextConfig = {
  output: 'standalone',
  // Don't advertise the framework to a scanner.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      // The portal resources page was renamed from /portal/free-resources.
      // Keep old welcome-email links working.
      {
        source: '/portal/free-resources',
        destination: '/portal/resources',
        permanent: true,
      },
      // One canonical host. www and the apex served identical HTML, which a
      // reputation scanner reads as a duplicate site. Traefik routes both hosts
      // to this container, so the redirect lives here — no label change. The
      // host match is EXACT: matching the apex too would loop the live site.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.icodemybusiness.com' }],
        destination: 'https://icodemybusiness.com/:path*',
        permanent: true,
      },
    ];
  },
}

module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});
