# Free-Tool Delivery — How It Works

How a customer goes from creating an account to receiving the free-tools welcome
email, and how tools are split between free and paid (Starter).

## End-to-end flow

1. A visitor opens **`/free-tools`** (`src/app/free-tools/page.tsx`). It is a
   public page — no auth gate. Unauthenticated users see a **"Get Free Access"**
   CTA.
2. Clicking the CTA redirects to Clerk:
   `/sign-in?redirect_url=/free-tools` (`handleGetAccess`). The user signs in or
   signs up via Clerk's hosted form (`src/app/sign-in/[[...sign-in]]/page.tsx`,
   `src/app/sign-up/[[...sign-up]]/page.tsx`).
3. On return to `/free-tools`, a `useEffect` runs **once** when the user is
   signed in and has no lead yet (`leadStatus === "no-access"`):
   - Creates/links a lead in Convex via `api.leads.createLead`
     (`convex/leads.ts`), keyed by `clerkUserId` + `email` + `sessionId`.
   - `POST`s to **`/api/email/welcome`** with `{ email, name }`.
4. **`/api/email/welcome`** (`src/app/api/email/welcome/route.ts`):
   - Requires a Clerk session (`auth()`); returns **401** if unauthenticated.
   - Renders `WelcomeEmail` (`src/emails/WelcomeEmail.tsx`) to HTML.
   - Sends it via **Resend** from `iCodeMyBusiness <hello@icodemybusiness.com>`,
     subject *"Welcome to iCodeMyBusiness — Your Free Tools Are Ready"*.
5. The page reflects state via `useLeadAccess` (`src/hooks/useLeadAccess.ts`):
   - `loading` → skeleton.
   - `no-access` (signed in, lead being created) → "Setting up your access…".
   - `has-access` → "Check your email!" with the user's address.

`/free-tools` is the **public marketing page** — it advertises the catalog,
captures the lead, and **triggers the welcome email** (the `useEffect` above).
The welcome email's **"Access Free Tools"** button links to the **gated portal
delivery page `/portal/free-resources`** on the app host (`NEXT_PUBLIC_APP_URL`
— the Hostinger VPS, since the apex still serves the static placeholder). That
portal page shows each free tool with a link to its public folder in the
`software-development-best-practices-guide` GitHub repo. Portal auth is enforced
by `src/app/portal/layout.tsx` (redirects to sign-in, preserving the path).

## What gets delivered

The lineup lives in `src/components/shared/FreeResourceCard.tsx`:

| Tool | List | Delivery | Where it comes from |
|------|------|----------|---------------------|
| Disk Space Optimizer | `BUILDER_RESOURCES` (free) | `download` | `public/downloads/disk-space-optimizer-skill.zip` |
| Google Drive Archiver | `BUILDER_RESOURCES` (free) | `download` | `public/downloads/google-drive-archiver-skill.zip` |
| Feature Factory + Best Practices | `BUILDER_RESOURCES` (free) | `external` | GitHub best-practices repo (the free hub) |
| Personal Time Planner | `PREMIUM_RESOURCES` (paid, $24.99/mo, *for everyone*) | `paid` → `/subscribe` | plan `personal` — ⚠️ tool asset + Stripe price |
| Side Gig / Contractor Work Time | `PREMIUM_RESOURCES` (paid, $24.99/mo, *for builders*) | `paid` → `/subscribe` | plan `contractor` — ⚠️ tool asset + Stripe price |
| Business Management (EOS) | `PREMIUM_RESOURCES` (paid, $49.99/mo, *for founders*) | `paid` → `/subscribe` | plan `business` — **coming soon** |

Free = the GitHub best-practices repo set (dev skills). Paid = continuously-
supported workflow tools sold on `/subscribe`, each targeting a different
audience.

On the **gated portal page** (`/portal/free-resources`), the three free tools
are shown as info cards that link to their public GitHub repo folders via the
`repoUrl` field on each `BUILDER_RESOURCES` entry:
`skills/disk-space-optimizer`, `skills/google-drive-archiver`, and
`skills/feature-factory`. (The public `/free-tools` marketing page still offers
the two Builder skills as direct `.zip` downloads.)

**Founder tools** (`FOUNDER_RESOURCES`) are free, founder-facing workflows kept
**in this repo** (packaged under `skill-packages/` → `public/downloads/` via
`skill-packages/build.sh`) and delivered as direct `.zip` downloads — no
external repo needed. They render in their own **"Founder tools"** section on
both `/free-tools` and `/portal/free-resources`. First entry: **Quarterly
Planner (EOS)** (`quarterly-planner-skill.zip`) — an EOS quarterly-planning skill
that reads context from Google Drive, Apple Notes, and Claude history.

On `/free-tools` the sections render in this order: **Free tools → Advanced**.
The Advanced section shows the three paid tools with a price badge + audience
label and a **"View plans →"** CTA to `/subscribe` (the coming-soon one shows a
disabled "Coming soon"). `/subscribe` sells them at $24.99 / $24.99 / $49.99
(`src/app/subscribe/page.tsx`); Business Management (EOS) is a waitlist.

### `delivery` types (`ResourceDelivery`)

- `download` — direct `<a download>` to a file in `public/downloads/`. No auth.
- `external` — opens an external link in a new tab (e.g. the GitHub repo).
- `email` — lead-gated; the welcome email is the intended delivery vehicle.
- `paid` — routes to `/subscribe`; gold "View plans" CTA (or "Coming soon" when
  `comingSoon`). Not delivered directly on this page.

## Data model

`leads` table (`convex/schema.ts`), indexed `by_email`, `by_clerkUserId`,
`by_sessionId`. A lead's existence (matched on `clerkUserId` when signed in, else
`sessionId`) is what `useLeadAccess` treats as "has access". There is **no
separate entitlements table and no role gating** for free tools — access is the
presence of a lead record.

## Key files

| Purpose | File |
|---------|------|
| Free-tools marketing page (sections, lead effect, CTA logic) | `src/app/free-tools/page.tsx` |
| Gated portal delivery page (GitHub repo links) | `src/app/portal/free-resources/page.tsx` |
| Resource definitions (free + paid, incl. `repoUrl`) | `src/components/shared/FreeResourceCard.tsx` |
| Welcome email route (Resend send) | `src/app/api/email/welcome/route.ts` |
| Welcome email template | `src/emails/WelcomeEmail.tsx` |
| Lead create / lookup | `convex/leads.ts` |
| Lead access hook | `src/hooks/useLeadAccess.ts` |
| Paid tiers | `src/app/subscribe/page.tsx` |

## Notes / gotchas

- **Dead code:** `convex/email.ts` (`sendWelcomeEmail` internalAction) duplicates
  the send but is **not wired to anything**. The live path is the Next.js route
  above. Don't edit the Convex action expecting it to change behavior.
- **Free email is accurate:** the welcome email lists only the real free tools
  (Disk Space Optimizer, Google Drive Archiver, Feature Factory + Best Practices)
  and its CTA points to `/free-tools`.
- **Paid tools are blocked on config** (⚠️ above): the three `/subscribe` tools
  need (a) Stripe products/prices created + `STRIPE_PRICE_ID_*` env vars, and
  (b) the actual tool deliverables. Until the price IDs exist, "Get Started"
  checkout returns a configuration error. Business Management (EOS) is
  intentionally **coming soon** (waitlist, no checkout). See the runbook.
- **Prod reality:** the app runs on the Hostinger VPS; the apex
  `icodemybusiness.com` still serves the old static placeholder. See the runbook.
