"use client";

import Script from "next/script";
import { isGoogleAdsTagId } from "@/lib/processors";

/**
 * Google Ads tag (gtag.js). OFF unless NEXT_PUBLIC_GOOGLE_ADS_TAG_ID is a valid
 * `AW-<digits>` id — so this ships inert, and the id is never in source. The same
 * condition decides whether /privacy names Google (src/lib/processors.ts), which
 * is why the check lives there. NEXT_PUBLIC_* is inlined at build time.
 *
 * Do not enable in production before the EU/EEA consent decision (Google consent
 * mode) and Matthew's sign-off on the /privacy wording.
 */
export function GoogleAdsTag() {
  const tagId = process.env.NEXT_PUBLIC_GOOGLE_ADS_TAG_ID;
  if (!isGoogleAdsTagId(tagId)) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${tagId}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-tag" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${tagId}');`}
      </Script>
    </>
  );
}
