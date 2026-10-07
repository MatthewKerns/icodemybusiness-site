# Comcast re-appeal — ticket IH270482834 — icodemybusiness.com

**Status: SENT 2026-09-17 by Matthew — and DENIED the same day** under a new ticket,
**IH270510985** ("not approved", 14:58 UTC, ~3 h after the 11:57 UTC acknowledgement). Found 2026-10-04
by reading the Zoho inbox; the acknowledgements land in Spam, the denials in Inbox. The earlier
"no reply as of 09-21" line was wrong. Both denials predate every fix listed below.

- **Route used:** spa.xfinity.com → Report an issue → "I can't reach a website that I want to go to"
- **Follow-up if no reply by 2026-09-24:** Customer Security Assurance, **888-565-4329**, quoting
  **IH270482834**. Ask the two questions the denial never answered: which category, which URL.
- **Cox is a separate engine** and needs its own report; a Comcast resolution does not carry over.

Preserved here because the only copies lived in two session scratch folders under `/private/tmp`.

## What Comcast said (first appeal, denied 2026-09-15)

> We completed the review of ticket IH270482834 and confirmed that the reported site was blocked by
> Advanced Security due to safety concerns. We'll continue to block the site for your protection
> until the website owner resolves the underlying issues.

No category, data source or URL was named.

## The letter as sent

> **Known error:** it says the review concluded "On 17 September 2026". The denial email is dated
> **15 September 2026**. Correct this in any follow-up.

---

Re: ticket IH270482834 — icodemybusiness.com

I own this domain. On 17 September 2026 the review concluded that the site "was
blocked by Advanced Security due to safety concerns" and would stay blocked
"until the website owner resolves the underlying issues". No category, data
source or URL was named, so I have addressed what I could identify myself and am
asking for the specifics.

What changed on the site since that review:

- https://icodemybusiness.com/privacy  — what data is collected, how it is stored, the
  processors used, and how to request a copy or deletion
- https://icodemybusiness.com/terms    — terms of use
- https://icodemybusiness.com/about    — who operates the business
- https://icodemybusiness.com/robots.txt and /sitemap.xml — previously absent; the
  sitemap lists only public pages, each returning 200
- All three policy pages are linked from the footer of every page.
- Our staging host now returns a disallow-all robots.txt and noindex headers.

What independent sources say about the domain today:

- Google Safe Browsing: no unsafe content for icodemybusiness.com,
  www.icodemybusiness.com or mango.icodemybusiness.com (checked 17 Sept 2026).
- Not listed on Spamhaus DBL, Spamhaus ZEN (both server IPs, 54.243.53.44 and
  2.25.207.149), SURBL multi, or URIBL multi. I confirmed those lookups
  were working by querying each list's published test entry, which returned the
  expected listing.
- In May 2026 Google flagged one subdomain, tiktok.icodemybusiness.com. That host
  was decommissioned and no longer resolves; Google's verdict has since cleared.

The site is a US consulting business operated by me under my own name, with a
published contact address. Sign-in is limited to client and authorized accounts;
no account is needed to read the public pages.

My requests:

1. Which threat category was applied, and which data source supplied it?
2. Which specific URL was evaluated?
3. Please re-scan the domain now rather than re-applying the earlier verdict. If
   the scan still finds something, tell me what it is and I will fix it.

Matthew Kerns, iCodeMyBusiness — matthew@icodemybusiness.com

---

## What the letter did not know (found 2026-09-20)

The letter addressed trust pages and staging indexing. Three things it did not mention were live
on the domain at the time, and any of them could explain a categoryless "safety concerns" verdict:

1. **Four ZIP archives of shell and Python scripts were served from `/downloads/`**, ungated and
   linked from `/free-tools` — one script deletes files, one runs a Google OAuth flow. ISP security
   products are malware engines first; this is the likeliest trigger. Fix: trust-remediation D1
   (commits 73beed3 + 1cb0dd8; **deployed 2026-09-21 12:32Z, verified from the VPS**): the tools moved to GitHub and the site links there.
2. **`staging.` served a byte-identical copy of the apex** (the letter correctly said only
   "de-indexed"). Fix: D2 (02599ff; **deployed 2026-09-21**): the staging host now answers a bare 404.
3. **Analytics were tunnelled through the domain** (`/ingest`, stated purpose: defeat tracking
   blockers) and carried visitor email and name, undisclosed in `/privacy`. Fix: D2 (02599ff; **deployed 2026-09-21**).

Cite these with the live before/after measurements in the follow-up call or any new report.

---

## Update 2026-09-30 — the engine, the subdomains, and the follow-up call

**Correction: Cox and Comcast are one engine.** The block page `safebrowse.io` is registered to
Comcast Corporation (`whois safebrowse.io`) and is one multi-brand page (Xfinity, Cox, Sky "Wifi
Sicuro"). Cox customers see Comcast's verdict, so ticket IH270482834 is the right channel for both.
The "Cox is a separate engine" line above was wrong.

**The block is per hostname** (corrected 22:25 UTC the same day — see below). `clerk.icodemybusiness.com` is served by Clerk on Cloudflare
(`frontend-api.clerk.services`), not by our VPS, and is blocked too (verified from a Cox connection:
http → 302 to `safebrowse.io/warn.html`, https → TLS handshake refused). From the VPS every host
returns 200.

**The 09-20 findings are fixed and live** (verified 2026-09-30 from the VPS, deployed sha `5079f53`):
`/downloads/` → 404 (D1, 73beed3), `staging.` → 404 (D2, 02599ff), `/ingest/*` → 404 (D2).

**New finding — third-party brands on our subdomains.** Certificate-transparency logs
(`crt.sh`, `%.icodemybusiness.com`) list 11 hostnames. On 2026-09-30:

| Host | State |
|---|---|
| `cultivateelite.` | live — another business's site (Cultivate Elite Basketball) |
| `ideabrandcoach.` | live — another brand (IDEA Brand Coach), sign-in page |
| `mcf-tts.` | **dangling** — A record → 44.223.102.94, a dead AWS EC2 IP (takeover risk) |
| `tiktok.` | no DNS; carried Google's "Deceptive pages" verdict in May 2026 |
| `mango.`, `demos.`, `engine-api.`, `www.`, `staging.`, `clerk.` | ours |

A domain created 2025-10-20 whose subdomains carry other brands' names (TikTok, IDEA Brand Coach,
Cultivate Elite) and sign-in pages matches the brand-impersonation pattern reputation engines score
on. **Inferred, not confirmed** — Comcast has never named the URL or category.

**Remediation (Matthew decided 2026-09-30: remove them entirely):** delete the `mcf-tts`,
`cultivateelite` and `ideabrandcoach` records at Namecheap (DNS: `registrar-servers.com`), by
hostname — `mango.` and `demos.` share the IP 54.243.53.44 and must stay.

### Call script — Customer Security Assurance, 888-565-4329, ticket IH270482834

1. "I'm the owner of icodemybusiness.com, ticket IH270482834. The first review was denied on
   **15 September** without a category or URL. I've made the changes below and I'm asking for a
   re-scan, and for the specific URL and category if anything is still flagged."
2. Changes, with dates:
   - Privacy, Terms, About pages, robots.txt and sitemap live since 21 September.
   - Downloadable script archives removed from the site (tools now on GitHub).
   - Staging copy of the site taken down; analytics no longer proxied through the domain.
   - Old and third-party subdomains removed on 30 September (`mcf-tts`, `cultivateelite`,
     `ideabrandcoach`; `tiktok` earlier).
   - Google Safe Browsing reports no unsafe content for the domain.
3. "My connection is on **Cox**, and I see the same Advanced Security page at safebrowse.io. Does
   this review cover Cox customers too, or do I need to file with Cox as well?"
4. Ask for: the category, the data source, the URL that was evaluated, and a turnaround date. Note
   the rep's name and any new ticket number here.

### Watching for the lift

The only vantage that can see the block is a Cox or Comcast connection. From the laptop:
`curl -s -o /dev/null -w '%{redirect_url}\n' http://icodemybusiness.com/` — a `safebrowse.io` URL
means still blocked; empty means lifted.

### Correction 2026-09-30 22:25 UTC — the apex is unblocked; the block is per hostname

Re-checked from the Cox connection: `https://icodemybusiness.com/` and `/book` → **200**, and plain
http now redirects to our own https (not safebrowse.io) — **the apex has been cleared**. Still
blocked: `clerk.icodemybusiness.com` (sign-in, Clerk on Cloudflare) and `mango.icodemybusiness.com`.
So verdicts are per hostname, not per domain; the call should ask for `clerk.` and `mango.` by name.

Visitor impact while `clerk.` stays blocked, on Cox/Comcast only: public pages load; sign-in and any
returning visitor with an expired Clerk session (the middleware handshake redirects to `clerk.`) hit
the block page. Code-side option (ask-first: auth/middleware change): serve Clerk's frontend API
through the apex with Clerk's proxy feature, so no visitor ever needs `clerk.` directly.

## Update 2026-10-02 — re-blocked; subdomains removed for real; sign-in off clerk.

**The apex is blocked again** from the Cox connection (http → 302 to `safebrowse.io`), two days
after the 09-30 clearance; `www.`, `clerk.` and `mango.` likewise. From the VPS and from
check-host.net nodes every host returns 200.

Changes since the 09-30 call script, for the next call:
- **DNS:** `mcf-tts`, `cultivateelite` and `ideabrandcoach` A records deleted at Namecheap
  (verified at `dns1.registrar-servers.com`); `demos.` was deleted too.
- **Server:** the Mango box (54.243.53.44) no longer answers for
  `cultivateelite.icodemybusiness.com` or `ideabrandcoach.icodemybusiness.com` — until today
  it still served those brands to anyone resolving them to its IP (Caddy blocks removed;
  backup `/opt/mango/Caddyfile.bak.pre-subdomain-removal-20261002`).
- **Sign-in no longer uses `clerk.`:** Clerk's Frontend API is proxied through the apex at
  `/__clerk` (`docs/DEPLOY.md` § Clerk proxy). Site pages contain no reference to
  `clerk.icodemybusiness.com`; visitors on Cox/Comcast can sign in while it stays flagged.

Ask on the call for re-scans of `icodemybusiness.com`, `www.`, `mango.` and `clerk.` by name.

## Update 2026-10-07 — block lifted again

From the Cox connection at 22:20 UTC: apex, `www.`, `clerk.` and `mango.` all answer directly
(http → our own https redirect, https 200/308). No Comcast email announced it (none since the
17 September denial). Nothing was submitted between 10-02 and 10-07, so the lift followed the
10-02 changes (subdomains gone from DNS and the Mango box, Clerk off `clerk.`) on the engine's
own re-scan — inferred from timing, not confirmed by Comcast. The 09-30 lift lasted two days;
re-check with `curl -s -o /dev/null -w '%{redirect_url}\n' http://icodemybusiness.com/` before
assuming it holds. Latest ticket for any call: **IH270510985**.
