# Ecommerce Context Pack

The methodology is industry-neutral; this file is the ecommerce content layer that makes the audit native rather than adapted. Every stage pulls from this. Note: the few-shot examples that ship in the source bundle are *non-ecommerce* (a dev shop, an equipment-share, sheds, a retail apothecary) — useful for structure, misleading for content. The ecommerce specifics below, and the real FBA discovery call referenced in the orchestrator, are the grounding to trust.

## The ecommerce funnel (replaces the generic sales journey)

Map current-state workflows and opportunities to these eight stages. Q1 of intake should usually anchor on whichever stage is leaking.

1. **Traffic & Acquisition** — paid (PPC/ACoS/TACoS), organic rank, external/social, email. CAC.
2. **Product Discovery & Merchandising** — search visibility, main image CTR, PDP/listing quality, variation structure, A+ content.
3. **Cart & Checkout** — conversion rate, abandonment, price points, bundles/upsell.
4. **Fulfillment & Shipping** — FBA / 3PL / self, AWD, lead times, stockouts, MCF.
5. **Post-Purchase & Support** — inserts, WISMO tickets, returns, the QR/email-capture flow (often broken).
6. **Retention & Loyalty** — repeat rate, email/SMS flows, subscription, winback.
7. **Reviews, UGC & Reputation** — rating, review velocity, solicitation, creator/affiliate content.
8. **Analytics & Reporting** — ROAS, inventory health, CM1/CM2/CM3, P&L.

## Baseline metrics to capture (feeds ecommerce_profile + ROI)

Platform · SKU/variation count · monthly revenue (and peak vs now) · AOV · conversion rate · main-image CTR · ad spend + ACoS/TACoS · CAC · LTV · repeat-purchase rate · return rate · review rating + velocity · CM1/CM2/CM3 (% and $) · landed cost/unit · supplier lead time · MOQ · cash runway / debt service · fulfillment model · owned-audience size. Capture each with its source quote and a confidence tag; never infer one metric from another and present it as stated (a derived figure is `confidence: "derived"`).

## Common ecommerce pain points (map to current_state_maps)

Manual restock decisions & stockouts killing rank · no abandoned-cart / post-purchase recovery · high WISMO support volume · disconnected systems (store ↔ 3PL ↔ accounting ↔ ads) · no review/UGC solicitation · manual ad-performance reporting · thin or inconsistent product data/imagery · generic listings with no brand feel · manual returns · no demand forecasting · founder time fragmenting across functions so each week's focus area means another falls apart (frequently the real binding constraint).

## Ecommerce opportunity catalog (seed opportunity_matrix.category)

Cart/post-purchase recovery · AI customer-support & WISMO deflection · review & UGC solicitation · inventory/restock forecasting · merchandising & PDP/listing optimization · ad-spend reporting automation · AI product-description/copy generation · returns automation · retention/winback flows · subscription churn prevention · listing image/A+/video overhaul · single-variable price testing · external-traffic / creator-affiliate programs · brand/creative system (logo, palette, lifestyle imagery, A+).

Note the zero/near-zero-cost levers — fixing a broken email capture, swapping a mis-targeted main image, risk-reversal/warranty copy, benefit-led bullets. These are disproportionately valuable for cash-constrained brands and tend to be quick wins.

## Connected tooling you can wire into an ecommerce audit

When these MCPs are connected, prefer real reads over asking the owner to recite numbers (and tag them `confidence: "stated"` with the tool as source):

- **Inventory Hero** — FBA inventory, restock recommendations, CM2/shipped-profit, landed cost, sales by date range (works even for hidden/inactive ASINs). Deep ops/financial baselines.
- **IDEA Brand Coach** — brand/funnel/asset-level audits (funnel audit, trust-gap, asset audit) — complements the ops audit with brand-side diagnosis.
- **PostHog** — funnels, conversion, web analytics for quantitative baselines on a DTC site.
- **Fathom** — pull the discovery-call transcript/summary directly when the audit is built from a recorded call.

A real read beats an owner's guess; an owner's guess beats a fabrication; a flagged unknown beats all three when there's no real signal.
