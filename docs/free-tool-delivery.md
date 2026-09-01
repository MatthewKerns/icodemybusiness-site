# Free-Tool Delivery — How It Works

How a visitor gets the free tools by email, and how paid work is now sold
(booked calls, not self-serve checkout).

## End-to-end flow

1. A visitor opens **`/free-tools`** (`src/app/free-tools/page.tsx`). It is a
   fully public page — every tool card's CTA (`Download` / `View on GitHub`)
   links directly to the tool, no account or email required.
2. The page also shows an email-capture form (`EmailCapture`,
   `src/components/shared/EmailCapture.tsx`, `source="free-tools"`) so visitors
   who just want the links by email can leave one, no Clerk account needed:
   - On submit, it calls `api.leads.createLead` (`convex/leads.ts`) directly
     from the client — creates/dedupes the lead by email, rate-limited.
   - On success it calls the page's `onSuccess` callback, which `POST`s to
     **`/api/email/welcome`** with `{ email }`.
3. **`/api/email/welcome`** (`src/app/api/email/welcome/route.ts`) — no auth
   required:
   - Confirms a `leads` row exists for the email (`api.leads.getLeadByEmail`)
     before sending, so the route can't be used as an open relay to spam
     arbitrary addresses.
   - Renders `WelcomeEmail` (`src/emails/WelcomeEmail.tsx`) to HTML and sends
     it via **Resend** from `iCodeMyBusiness <hello@icodemybusiness.com>`.
4. The welcome email's **"Access Free Tools"** button links straight to the
   public **`/free-tools`** page — no sign-in, no gated portal.

## What gets delivered

The lineup lives in `src/components/shared/FreeResourceCard.tsx`:

| Tool | List | Delivery | Where it comes from |
|------|------|----------|---------------------|
| Disk Space Optimizer | `BUILDER_RESOURCES` (free) | `download` | `public/downloads/disk-space-optimizer-skill.zip` |
| Google Drive Archiver | `BUILDER_RESOURCES` (free) | `download` | `public/downloads/google-drive-archiver-skill.zip` |
| Feature Factory + Best Practices | `BUILDER_RESOURCES` (free) | `external` | GitHub best-practices repo (the free hub) |

Free = the GitHub best-practices repo set (dev skills), all directly
accessible on `/free-tools` regardless of whether the visitor left an email.

On the **gated portal page** (`/portal/resources`, Clerk-authenticated
customers only), the same three free tools plus the founder tools are shown
again as a convenience for signed-in users — but `/free-tools` is the
canonical, always-accessible public source.

**Founder tools** (`FOUNDER_RESOURCES`) are free, founder-facing workflows kept
**in this repo** (packaged under `skill-packages/` → `public/downloads/` via
`skill-packages/build.sh`) and delivered as direct `.zip` downloads — no
external repo needed. They render in their own **"Founder tools"** section on
both `/free-tools` and `/portal/resources`. First entries: **Quarterly
Planner (EOS)** and the **E-Commerce Brand Business Automation Audit**.

### `delivery` types (`ResourceDelivery`)

- `download` — direct link to a file in `public/downloads/`. No auth.
- `external` — opens an external link in a new tab (e.g. the GitHub repo).
- `email` — lead-gated; not currently used by any resource, but the
  `EmailCapture` success-state and the `hasAccess` flag on `/free-tools`
  support it if a future tool needs the welcome email as its delivery vehicle.
- `paid` — **retired.** `PREMIUM_RESOURCES` (the old $24.99/$49.99 tiers) is
  still defined in `FreeResourceCard.tsx` but no longer rendered anywhere.
  Paid interest now routes to `/consulting` (a free, no-pricing booked call —
  the owner sells on the call, not through self-serve checkout). `/subscribe`
  redirects to `/consulting`. The Stripe checkout machinery (API routes,
  `EmbeddedCheckoutDialog`, `PricingTier`, webhook) stays in the repo dormant
  in case self-serve is relaunched later.

## Data model

`leads` table (`convex/schema.ts`), indexed `by_email`, `by_clerkUserId`,
`by_sessionId`. `createLead` dedupes on email. `getLeadByEmail` is the only
lookup query left (used to gate the welcome-email send); the two
Clerk/session-based access-check queries (`getLeadBySessionId`,
`getLeadByClerkUserId`) and the `useLeadAccess` hook that used them were
removed along with the Clerk-gated flow.

## Key files

| Purpose | File |
|---------|------|
| Free-tools marketing page (email capture, tool grids) | `src/app/free-tools/page.tsx` |
| Gated portal delivery page (signed-in customers) | `src/app/portal/resources/page.tsx` |
| Shared email-capture form | `src/components/shared/EmailCapture.tsx` |
| Resource definitions (free + dormant paid) | `src/components/shared/FreeResourceCard.tsx` |
| Welcome email route (Resend send, lead-gated) | `src/app/api/email/welcome/route.ts` |
| Welcome email template | `src/emails/WelcomeEmail.tsx` |
| Lead create / lookup | `convex/leads.ts` |
| Booked-call sales page (replaces `/subscribe`) | `src/app/consulting/page.tsx` |

## Notes / gotchas

- **Dead code:** `convex/email.ts` (`sendWelcomeEmail` internalAction) duplicates
  the send but is **not wired to anything**. The live path is the Next.js route
  above. Don't edit the Convex action expecting it to change behavior.
- **Free email is accurate:** the welcome email lists only the real free tools
  (Disk Space Optimizer, Google Drive Archiver, Feature Factory + Best Practices)
  and its CTA points to `/free-tools`.
- **Prod reality:** the app runs on the Hostinger VPS; the apex
  `icodemybusiness.com` still serves the old static placeholder. See the runbook.
