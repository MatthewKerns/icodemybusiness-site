"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { META_PIXEL_ID, META_STANDARD_EVENTS, trackMeta } from "@/lib/meta-pixel";

// Meta's base code. `autoConfig` is off so the pixel sends only the events we
// fire ourselves — no automatic button-click or page-metadata events, which is
// what lets /privacy say exactly what Meta receives.
const BASE_CODE = `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('set','autoConfig',false,'${META_PIXEL_ID}');
fbq('init','${META_PIXEL_ID}');
fbq('track','${META_STANDARD_EVENTS.PAGE_VIEW}');`;

export function MetaPixel() {
  const pathname = usePathname();
  const firstRender = useRef(true);

  useEffect(() => {
    // The base code sends the landing page's PageView. App Router navigations
    // don't reload the page, so every later route change is sent from here.
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    trackMeta(META_STANDARD_EVENTS.PAGE_VIEW);
  }, [pathname]);

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {BASE_CODE}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Meta's no-JS fallback is a 1x1 image request */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=${META_STANDARD_EVENTS.PAGE_VIEW}&noscript=1`}
        />
      </noscript>
    </>
  );
}
