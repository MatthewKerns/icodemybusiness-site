# Runbook — Free-Tool Email Delivery

Operational guide for the welcome-email / free-tools delivery system.
See `free-tool-delivery.md` for how the flow works.

## Where it runs

| Environment | URL | Serves the app? |
|-------------|-----|-----------------|
| **Staging (the only place the app runs)** | `https://staging.icodemybusiness.com` | ✅ Yes — Namecheap A record → VPS, Traefik router set by `./deploy.sh staging` (the old `*.hstgr.cloud` host is unrouted, 404) |
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
| `NEXT_PUBLIC_CONVEX_URL` | Lead create/lookup | Lead never created → welcome-email send has no matching lead, 400 |

`/api/email/welcome` no longer requires a Clerk session — the free-tools
capture is email-only. It's gated on a matching `leads` row instead (see
`docs/free-tool-delivery.md`).

**Resend domain:** `icodemybusiness.com` must be a **verified domain** in the
Resend account (SPF/DKIM). If unverified, Resend returns an error and the route
responds 500 (`InternalError`) — check Resend dashboard → Domains.

Backends are currently **dev-tier** (Convex dev `neat-hamster-414`, Clerk **test**
keys, Resend **live** key). Functional but promote to prod before heavy traffic.

## How to test

### Quick health probe (no auth)
```bash
node -e 'const https=require("https");
const h="staging.icodemybusiness.com";
["/free-tools","/downloads/disk-space-optimizer-skill.zip"].forEach(p=>
 https.get({host:h,path:p},r=>console.log(r.statusCode,p)));
const req=https.request({host:h,path:"/api/email/welcome",method:"POST",
 headers:{"Content-Type":"application/json"}},r=>console.log(r.statusCode,"POST /api/email/welcome"));
req.end(JSON.stringify({email:"no-such-lead@example.com"}));'
```
Expected: `/free-tools` → 200 (fully public, no auth), download → 200,
`POST /api/email/welcome` with an email that was never captured → **400**
(no matching `leads` row — correctly rejected, not an open relay). The
welcome-email CTA points straight at the public `/free-tools` page.

### Full flow (manual, end-to-end)
1. Open `/free-tools` in a fresh browser/incognito.
2. Enter a **real inbox you control** into the email-capture form and submit —
   no account or sign-in required.
3. The form should show its success state ("Check your email — we've sent
   your download links.").
4. Confirm the welcome email arrives (check spam). The **"Access Free Tools"**
   button should land on the public `/free-tools` page — no sign-in prompt.
5. On `/free-tools`, confirm each tool card's CTA works directly: **Download**
   for the two Builder skills, **View on GitHub** for Feature Factory.

## Failure modes

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| EmailCapture form stuck on loading | Convex unreachable or `createLead` error | Check `NEXT_PUBLIC_CONVEX_URL`; Convex logs |
| No email received | `RESEND_API_KEY` unset (503), or Resend domain unverified (500), or in spam | Check route response / Resend dashboard → Logs & Domains |
| Email CTA 404s or lands on the static placeholder | `appUrl` points at the apex (still placeholder) instead of the app host | CTA must be `${appUrl}/free-tools`; set `NEXT_PUBLIC_APP_URL` to the app host in `WelcomeEmail.tsx` |
| "View on GitHub" 404s | The two skills not yet pushed to the public repo | Push `skills/disk-space-optimizer` + `skills/google-drive-archiver` to `software-development-best-practices-guide` |
| `POST /api/email/welcome` returns 400 "No matching lead" | The email never went through `createLead` first (direct API call, or a typo) | Expected for an unknown email — capture it via the form first |

Every send is recorded in Convex (append-only `emailSends` table: to, template,
subject, `sent`/`failed`, Resend id, error, leadId) and a successful welcome
send stamps `welcomeEmailSentAt` / `welcomeEmailResendId` on the lead. Audit
from the database without the Resend dashboard:

```bash
npx convex run emailSends:listRecent '{"limit":10}'
npx convex run emailSends:listForEmail '{"email":"someone@example.com"}'
```

The VPS Resend key is a *sending-only* key: `GET /domains` and `GET /emails/:id`
return 401 with it, so Resend-side delivery events can't be read from the
server — a 200 + id from `emails.send` already proves the from-domain is
verified (Resend rejects unverified domains), and inbox arrival is the
delivery check. Measured 2026-09-02 on staging: Resend accepted in ~1s.

## Free tools catalog

**Free** = the GitHub best-practices repo set, shown in the "Free tools"
section on `/free-tools`: Disk Space Optimizer + Google Drive Archiver
(downloads) and Feature Factory + Best Practices (GitHub link). The welcome
email lists exactly these. Fully working today, no auth or checkout involved.

## ⚠️ Self-serve pricing — retired, not just unconfigured

The old three-tier `/subscribe` product ($24.99 personal, $24.99 contractor,
$49.99 business) is **retired**, not merely blocked on config: `/subscribe`
now redirects to `/consulting` and the priced cards no longer render anywhere
public. Paid interest is sold on a free, no-pricing booked call instead — see
`src/app/consulting/page.tsx`. The Stripe checkout stack (API routes,
`EmbeddedCheckoutDialog`, `PricingTier`, webhook, `src/lib/stripe-plans.ts`)
stays in the repo dormant — untouched, unlinked — in case self-serve
checkout is relaunched later. If it is, the old setup steps (create Stripe
prices, set `STRIPE_PRICE_ID_*`, re-link the CTAs) still apply; see git
history on this file for the prior version of those instructions.

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
  follow it with `./deploy.sh staging` to swap the running container onto the new
  `icodemybusiness-site:latest` image (staging router only; `run` is the legacy hstgr-host mode).
- `./deploy.sh cutover` additionally adds the apex+www Traefik router (only after
  the Namecheap DNS change above).
- Secrets come from `/opt/icodemybusiness-site/.env.build` — never baked into the
  image. The shared VPS also runs other stacks: **deploy alongside, don't wipe.**

After deploy, re-run the health probe and the full-flow test above.
