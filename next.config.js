const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Reverse-proxy PostHog ingestion through our own origin so ad/tracking
  // blockers don't drop analytics. The client points api_host at "/ingest"
  // (set NEXT_PUBLIC_POSTHOG_HOST=/ingest, or remove it, to activate).
  // Destinations are PostHog EU cloud (project 206048).
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
    ];
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
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
