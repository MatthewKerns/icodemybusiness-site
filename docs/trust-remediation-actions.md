# Trust remediation — actions only Matthew can take

Companion to the code fixes (D1 `73beed3`, D2 `02599ff`+`cd30a6f`, privacy `f41b2ab`) and to
`docs/comcast-reappeal-2026-09-17.md`. Written 2026-09-21. **Do the ISP and vendor steps only after
D1 and D2 are deployed and verified from the VPS** — a re-scan of the old site earns another denial.

The goal is met only when the site loads on a real Comcast connection and a real Cox connection.
Datacenter checks (all green since 2026-09-20) cannot show that.

## 1. Comcast (ticket IH270482834)

- Re-appeal sent 2026-09-17. Stated turnaround ~3 business days.
- **If no reply by 2026-09-24:** call Customer Security Assurance, **888-565-4329**, quote
  **IH270482834**, and ask: *which category, and which URL?* Correct the letter's date (the denial was
  15 Sept, not 17). Cite the three fixes in the re-appeal doc, with deploy dates.

## 2. Cox (separate engine — a Comcast fix does not carry over)

Cox blocks both the apex and `mango.icodemybusiness.com` on your home Wi-Fi.
- From the block page itself, use its "report" / "this site is safe" link if it offers one, for
  **both** hostnames.
- Otherwise contact Cox support and report a false positive in Advanced Security for
  `icodemybusiness.com` and `mango.icodemybusiness.com`. Ask the same two questions.
- In the Cox Panoramic Wi-Fi app you can turn Advanced Security off for your own network meanwhile;
  that fixes it for you only, not for visitors.

## 3. Reputation vendors (ISP products license these feeds; Cox/Comcast don't publish which)

Look the domain up first; submit a review only where it is listed as anything other than a normal
business category.

| vendor | where | checked 2026-09-21 |
|---|---|---|
| Webroot / BrightCloud | https://www.brightcloud.com/tools/url-ip-lookup.php | 200 |
| Broadcom / Symantec Site Review | https://sitereview.bluecoat.com/ | 200 |
| Trellix (McAfee) TrustedSource | https://trustedsource.org/ | 200 |
| Fortinet FortiGuard | https://www.fortiguard.com/webfilter | 200 |
| Netcraft (report a mistake) | https://report.netcraft.com/report/mistake | 200 |
| Cisco Talos | https://talosintelligence.com/reputation_center | 403 to a script — confirm in a browser |
| Bitdefender | vendor support site | 403 to a script — confirm in a browser |
| Google Safe Browsing | clean for apex/www/mango as of 2026-09-20; error report: https://safebrowsing.google.com/safebrowsing/report_error/ | 200 |

**Also verify the domain in Google Search Console** (board item D9). The May 2026 flag was cleared
through a GSC review request, and GSC notifies you of a new one.

## 4. DNS at Namecheap (email trust — unlikely to be the block's cause, cheap to fix)

Measured 2026-09-20: SPF present (`v=spf1 include:zohomail.com ~all`), **no DMARC**, no DKIM at the
`default` selector, no CAA.

1. **DKIM** — Zoho Mail admin → domain → Email Authentication → DKIM. It may already exist under a
   Zoho selector (only `default` was checked). If not, add the selector Zoho generates as a TXT record
   at Namecheap, then press Verify in Zoho.
2. **DMARC** — Namecheap → Advanced DNS → add TXT, host `_dmarc`, value:
   `v=DMARC1; p=none; rua=mailto:dmarc@icodemybusiness.com; fo=1`
   `p=none` only monitors; move to `quarantine` after a few weeks of clean reports.
3. **SPF** — leave `~all` until it's confirmed nothing else sends as `@icodemybusiness.com` (check the
   Mango AWS SES sending identity first; if it uses this domain, add `include:amazonses.com`).
4. **CAA** — skip. A wrong record blocks certificate renewal (current cert expires 2026-10-22).

## 5. Confirm the goal

Once Comcast/Cox say it's unblocked: load https://icodemybusiness.com on your home Wi-Fi (Cox), and
ask someone on Xfinity to load it. Both must show the site, not a warning page.
