# Trust pages — what changed and why (2026-09-17)

## Why this exists

On 2026-09-15 Comcast **denied** an unblock request for `icodemybusiness.com`
(ticket IH270482834): *"the reported site was blocked by Advanced Security due to
safety concerns. We'll continue to block the site for your protection until the
website owner resolves the underlying issues."* Comcast's Advanced Security (the
`safebrowse.io` warning page) blocks the whole domain by name, so the apex, `www.`
and `mango.` are all unreachable on Comcast and Cox networks.

An investigation from outside the home network found **no public blocklist entry**
for any of our hostnames or IPs (Spamhaus DBL and ZEN, SURBL, URIBL, SORBS all
clean, with control lookups proving the queries work; Google Safe Browsing status
1 for all three hosts). What it did find is the gap this change closes: the
marketing site at the apex offered a **sign-in flow and no policy pages at all**.

| URL | Before | After |
|---|---|---|
| `icodemybusiness.com/about` | 404 | 200 |
| `icodemybusiness.com/privacy` | 404 | 200 |
| `icodemybusiness.com/terms` | 404 | 200 |
| `icodemybusiness.com/robots.txt` | 404 | 200 |
| `icodemybusiness.com/sitemap.xml` | absent | 200 |

For contrast, `mango.icodemybusiness.com` has served `/about`, `/privacy`,
`/terms` and `/robots.txt` since the May 2026 Google Safe Browsing incident
(`app/presentation/routes/api_auth.py` in the mango repo). That remediation was
applied to the Mango app only; this site never got it.

## What changed

- **`src/app/about/page.tsx`** — who operates the practice (Matthew Kerns,
  iCodeMyBusiness), what it sells, what our own applications are, and a working
  contact address.
- **`src/app/privacy/page.tsx`** — what we collect (contact details, account
  identity via Clerk, data inside the applications, aggregate analytics), how it
  is stored, the processors we use, and how to request a copy or deletion. States
  plainly that we do not sell or rent data and never use it for advertising.
- **`src/app/terms/page.tsx`** — what the site is, acceptable use, ownership, the
  no-warranty position, and contact.
- **`src/components/legal/LegalPage.tsx`** — the shared shell for those three,
  using the site's existing design tokens.
- **`src/components/landing/Footer.tsx`** — "About" joins the Pages column, and a
  Legal nav (Privacy Policy, Terms of Use) sits in the footer bar on **every**
  page. A policy page nothing links to counts for little.
- **`src/app/robots.ts`** — a real robots.txt: allow the marketing pages, disallow
  `/api/`, `/admin`, `/forbidden`, `/portal`, `/sign-in`, `/sign-up`, and point at
  the sitemap.
- **`src/app/sitemap.ts`** — the 14 public marketing URLs, and nothing gated.
- **`src/middleware.ts`** — `staging.icodemybusiness.com` now answers
  `X-Robots-Tag: noindex, nofollow` on every response and serves a disallow-all
  `robots.txt`. See the limit below.

## The staging host — still open

`staging.icodemybusiness.com` serves a **byte-identical copy** of the apex
(83,973 bytes from both, 2026-09-15), publicly, from the same container. A
duplicate of a site on a second host is a cloned-site signal.

The middleware change only asks crawlers to stay away. **Until the Traefik route
is changed on the VPS, staging remains publicly reachable by anyone with the
URL.** That change is written up in `docs/staging-route-patch.md` and has to be
applied by hand on the server.

## For the re-appeal

Points worth making to Comcast (Customer Security Assurance, 888-565-4329, ticket
IH270482834):

1. The domain appears on no public blocklist, and Google Safe Browsing reports it
   clean — verifiable independently.
2. The May 2026 Google "Deceptive pages" verdict concerned a subdomain
   (`tiktok.icodemybusiness.com`) that has been decommissioned; it no longer
   resolves.
3. The apex now publishes About, Privacy, Terms, robots.txt and a sitemap, all
   linked from every page.
4. The operator is a named US business with a working contact address:
   Matthew Kerns, matthew@icodemybusiness.com.
5. Ask Comcast to name the **specific URL and category** behind the verdict. Their
   denial names neither, and nothing public corroborates it.
