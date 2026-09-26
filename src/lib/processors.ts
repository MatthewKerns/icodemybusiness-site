/**
 * Every third party this site or its applications sends visitor data to — the
 * single source of truth that /privacy renders from.
 *
 * Why this is a list and not prose: until 2026-09-21 /privacy named four
 * processors while the code talked to ten, and it described analytics as
 * "aggregate page and referral counts" while session replay ran on 10% of
 * visits and email + name went to PostHog. A reviewer comparing a policy to a
 * page's own network traffic is exactly how a domain under an ISP trust review
 * loses the argument (docs/trust-pages.md). src/lib/__tests__/processors.test.ts
 * pins the list to the page. Add a processor here in the same change that
 * starts sending it data.
 */
export interface Processor {
  name: string;
  purpose: string;
  /** What it receives, in plain words. */
  data: string;
}

export const PROCESSORS: Processor[] = [
  {
    name: "Clerk",
    purpose: "sign-in and account management",
    data: "your email address and account ID, if you sign in",
  },
  {
    name: "Convex",
    purpose: "the database behind the site and its applications",
    data: "what you submit in forms and the assessment chat, and your account records",
  },
  {
    name: "PostHog (US)",
    purpose: "product analytics",
    data: "pages viewed, referrer, device and browser type, and — if you are signed in — your account ID (never your email or name)",
  },
  {
    name: "Sentry",
    purpose: "error monitoring and session replay",
    data: "technical details of errors, and on about 1 in 10 visits a replay of page interactions with all text and form inputs masked",
  },
  {
    name: "Anthropic",
    purpose: "the AI assessment and chat features",
    data: "the messages you type into those features",
  },
  {
    name: "Resend",
    purpose: "sending email",
    data: "your email address and the content of emails we send you",
  },
  {
    name: "Calendly",
    purpose: "booking calls",
    data: "what you enter when you book, inside Calendly's own embedded page",
  },
  {
    name: "Stripe",
    purpose: "payments, where offered",
    data: "payment details, entered on Stripe's own checkout — we never see card numbers",
  },
  {
    name: "Clockify",
    purpose: "time tracking in the Mango dashboard",
    data: "time entries, only if you connect your own Clockify account",
  },
];

/** First-party cookies this site sets itself (third-party tools set their own). */
export const FIRST_PARTY_COOKIES = [
  {
    name: "icmb_source",
    purpose: "remembers which link or campaign brought you here (the ?src= parameter)",
    lifetime: "30 days",
  },
  {
    name: "icmb_variant",
    purpose: "remembers which version of a page you were shown (the ?variant= parameter)",
    lifetime: "30 days",
  },
];
