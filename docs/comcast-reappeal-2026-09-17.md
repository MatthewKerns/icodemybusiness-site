# Comcast re-appeal — ticket IH270482834 — icodemybusiness.com

**Status: SENT 2026-09-17 by Matthew** (confirmed by him on 2026-09-20; the drafting session had
recorded "nothing submitted", so the send itself is his word, not a logged event). No reply as of
2026-09-21. Comcast's stated turnaround is about 3 business days.

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
   (commit 73beed3; **not yet deployed** as of 2026-09-21): the tools moved to GitHub and the site links there.
2. **`staging.` served a byte-identical copy of the apex** (the letter correctly said only
   "de-indexed"). Fix: D2 (02599ff; **not yet deployed**): the staging host now answers a bare 404.
3. **Analytics were tunnelled through the domain** (`/ingest`, stated purpose: defeat tracking
   blockers) and carried visitor email and name, undisclosed in `/privacy`. Fix: D2 (02599ff; **not yet deployed**).

Once deployed and verified from the VPS, cite these with the live before/after measurements in the follow-up call or any new report.
