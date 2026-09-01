# Runbook — Free-Tool Email Delivery

Operational guide for the welcome-email / free-tools delivery system.
See `free-tool-delivery.md` for how the flow works.

## Where it runs

| Environment | URL | Serves the app? |
|-------------|-----|-----------------|
| **VPS (current prod for the app)** | `https://icodemybusiness.srv1757482.hstgr.cloud` | ✅ Yes |
| **Apex** | `https://icodemybusiness.com` | ❌ No — old static GitHub Pages placeholder |

- VPS: Hostinger KVM, `root@2.25.207.149`, container `icodemybusiness-site` on
  port 3000 behind Traefik. App source at `/opt/icodemybusiness-site`.
- **Apex cutover is pending** a manual Namecheap DNS change (`@` A →
  `2.25.207.149`, `www` CNAME → `icodemybusiness.com`), then `./deploy.sh
  cutover` on the VPS. Until then, the public apex does **not** run the app.
  (DNS is on Namecheap, not Hostinger/Cloudflare — no API creds; Matthew must do
  it in the Namecheap dashboard.)

## Required environment

Set in `/opt/icodemybusiness-site/.env.build` on the VPS (copy of `.env.local`,
chmod 600). See `.env.example`.

| Var | Purpose | Failure if missing |
|-----|---------|--------------------|
| `RESEND_API_KEY` | Resend auth | Route throws 503 `SERVICE_UNAVAILABLE`; **no email sent** |
| `RESEND_FROM_EMAIL` | From address (default `hello@icodemybusiness.com`) | Falls back to default |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Auth (route requires session) | Signup/auth broken → 401 on send |
| `NEXT_PUBLIC_CONVEX_URL` | Lead create/lookup | Lead never created → effect/email never fire |

**Resend domain:** `icodemybusiness.com` must be a **verified domain** in the
Resend account (SPF/DKIM). If unverified, Resend returns an error and the route
responds 500 (`InternalError`) — check Resend dashboard → Domains.

Backends are currently **dev-tier** (Convex dev `neat-hamster-414`, Clerk **test**
keys, Resend **live** key). Functional but promote to prod before heavy traffic.

## How to test

### Quick health probe (no auth)
```bash
node -e 'const https=require("https");
const h="icodemybusiness.srv1757482.hstgr.cloud";
["/free-tools","/downloads/disk-space-optimizer-skill.zip"].forEach(p=>
 https.get({host:h,path:p},r=>console.log(r.statusCode,p)));
const req=https.request({host:h,path:"/api/email/welcome",method:"POST"},r=>console.log(r.statusCode,"POST /api/email/welcome"));req.end();'
```
Expected: `/free-tools` → 200 (public marketing), download → 200,
`POST /api/email/welcome` → **401** (correctly auth-gated). The welcome-email
CTA points to the **gated** `/portal/free-resources` (the app host —
`NEXT_PUBLIC_APP_URL`); unauthenticated, it redirects to `/sign-in`, so don't
expect a bare 200 there.

### Full flow (manual, end-to-end)
1. Open `/free-tools` in a fresh browser/incognito → click **Get Free Access**.
2. Complete Clerk sign-up with a **real inbox you control**.
3. On redirect back to `/free-tools`, the page should show **"Setting up your
   access…"** then **"Check your email!"** (this is the lead-create + email
   trigger).
4. Confirm the welcome email arrives (check spam). The **"Access Free Tools"**
   button must land on `/portal/free-resources` (signed in → the gated delivery
   page; signed out → sign-in, then back to it).
5. On `/portal/free-resources`, confirm each free tool's **"View on GitHub"**
   link opens the right repo folder (`skills/disk-space-optimizer`,
   `skills/google-drive-archiver`, `skills/feature-factory`).

## Failure modes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Page stuck on "Setting up your access…" | Lead never created — Convex unreachable or `createLead` error | Check `NEXT_PUBLIC_CONVEX_URL`; Convex logs |
| No email received | `RESEND_API_KEY` unset (503), or Resend domain unverified (500), or in spam | Check route response / Resend dashboard → Logs & Domains |
| Email CTA 404s or lands on the static placeholder | `appUrl` points at the apex (still placeholder) instead of the app host | CTA must be `${appUrl}/portal/free-resources`; set `NEXT_PUBLIC_APP_URL` to the app host in `WelcomeEmail.tsx` |
| Email CTA lands on portal dashboard, not free tools | `redirect_url` not preserved through sign-in | `portal/layout.tsx` must redirect with `redirect_url=${pathname}` |
| "View on GitHub" 404s | The two skills not yet pushed to the public repo | Push `skills/disk-space-optimizer` + `skills/google-drive-archiver` to `software-development-best-practices-guide` |
| `POST /api/email/welcome` returns 401 in browser | Not signed in / Clerk session missing | Expected when unauthenticated; sign in first |
| "Get Started" on /subscribe errors | `STRIPE_PRICE_ID_PERSONAL`/`_CONTRACTOR` not set | Create the Stripe prices + set env vars (see "Paid tools" below) |

Resend send results are logged (`data?.id` on success, `error.message` on
failure) — check the container logs / Resend dashboard to confirm delivery.

## Free vs paid catalog

- **Free** = the GitHub best-practices repo set, shown in the "Free tools"
  section on `/free-tools`: Disk Space Optimizer + Google Drive Archiver
  (downloads) and Feature Factory + Best Practices (GitHub link). The welcome
  email lists exactly these. Fully working today.
- **Paid** = three continuously-supported workflow tools on `/subscribe`
  (`src/app/subscribe/page.tsx`), each for a different audience:
  - `personal` — **Personal Time Planner** — $24.99/mo — for everyone
  - `contractor` — **Side Gig / Contractor Work Time** — $24.99/mo — for builders
  - `business` — **Business Management (EOS)** — $49.99/mo — for founders —
    **coming soon** (waitlist via the email-capture section; no checkout)

## ⚠️ Paid tools — blocked on Stripe config + assets

To make the paid checkout functional:
1. In the **Stripe dashboard**, create a product + recurring monthly price for
   each tool ($24.99 personal, $24.99 contractor; $49.99 business when ready).
2. Set the price IDs in `/opt/icodemybusiness-site/.env.build` (see `.env.example`):
   `STRIPE_PRICE_ID_PERSONAL`, `STRIPE_PRICE_ID_CONTRACTOR`,
   `STRIPE_PRICE_ID_BUSINESS`. These map to the plan keys in
   `src/lib/stripe-plans.ts`; the checkout route accepts `personal`/`contractor`
   (not `business`, which is coming soon), and the Stripe webhook maps the price
   back to the plan via `planFromPriceId`.
3. Redeploy. "Get Started" then opens the embedded checkout for that tool.
4. Provide the actual tool deliverables (the planner / time-tracker / EOS
   workflows) — these are MCP-server workflows, delivered/connected after
   purchase. Gate any downloadable asset behind
   `api.subscriptions.getActiveSubscription` before revealing it.

Until step 2 is done, the personal/contractor "Get Started" buttons return a
"Plan not configured" error. Business Management stays a waitlist until launch.

## Deploy

Deploy is a manual rsync + `deploy.sh` on the VPS (no push-to-deploy currently):
```bash
# from repo root — rsync source to the VPS.
# CRITICAL: deploy.sh and .env.build live ONLY on the VPS. If you use --delete,
# you MUST exclude them (and other VPS-only files) or you will wipe the secrets
# and the deploy script. Safer to omit --delete unless you know what's on the box.
rsync -az \
  --exclude node_modules --exclude .next --exclude .git --exclude _legacy \
  --exclude .env.build --exclude deploy.sh \
  ./ root@2.25.207.149:/opt/icodemybusiness-site/
ssh root@2.25.207.149 'cd /opt/icodemybusiness-site && ./deploy.sh build'
```
- `./deploy.sh build` rebuilds the image **but does not restart the container** —
  follow it with `./deploy.sh run` to swap the running container onto the new
  `icodemybusiness-site:latest` image (test-host router only).
- `./deploy.sh cutover` additionally adds the apex+www Traefik router (only after
  the Namecheap DNS change above).
- Secrets come from `/opt/icodemybusiness-site/.env.build` — never baked into the
  image. The shared VPS also runs other stacks: **deploy alongside, don't wipe.**

After deploy, re-run the health probe and the full-flow test above.
