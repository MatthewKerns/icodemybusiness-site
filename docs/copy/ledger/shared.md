# Ledger — shared components

Strings that appear on every (or many) pages, ruled once here and marked `shared` in the
per-page ledgers. Sources: `Header`/`Footer`, `CommunityBanner`, `SocialProofBar`,
`EmailCapture` defaults, `src/app/layout.tsx` metadata, loading states.

| # | Line | Where | Verdict | Why | Matthew |
|---|---|---|---|---|---|
| S01 | iCodeMyBusiness | header / footer wordmark | keep | Brand. | |
| S02 | Home · Academy · Free Intro Call · Consulting · Free Tools · Connect · Mango · Services | nav | ask | Eight items. "Free Intro Call" and "Book a Call" (button) both go to /book — one door twice. And the nav order doesn't follow the ladder (free → consulting → done-for-you). Your call on the set and order. | |
| S03 | Book a Call | header button | keep | Primary action; matches /book. | |
| S04 | Save time. Make more money. Make a difference. | footer tagline | keep | P11 (09-08). | |
| S05 | matthew@icodemybusiness.com | footer | keep | Contact. | |
| S06 | Pages / Connect | footer labels | keep | Labels. | |
| S07 | © 2026 iCodeMyBusiness. All rights reserved. | footer | keep | Legal. | |
| S08 | Join the Inner Circle | community banner heading | keep | Community name. | |
| S09 | Connect with other business owners using AI to grow. Share wins, get feedback, and access exclusive content. | community banner body | change | "using AI to grow" sells the vehicle (P5); "access exclusive content" promises something on Skool — is there exclusive content there? Suggest: "Other business owners building the systems that run theirs. Share wins, get feedback." | |
| S10 | Join on Skool | community banner CTA | keep | Link label. | |
| S11 | 8+ · Years Professional Software Development Experience | social proof bar | ask | Your claim to confirm (same as academy row 11). | |
| S12 | Premium · Consulting | social proof bar | ask | A "stat" with no number; reads as filler. Cut, or replace with something you own (e.g. "2 · Done-for-you slots a month", from the paper plan)? | |
| S13 | 3 · Free Tools | social proof bar | keep | Matches /free-tools. | |
| S14 | Get free AI tools instantly | EmailCapture default headline | change | P5. Only used where a page passes no headline (error boundary). Suggest "Get the free tools". | |
| S15 | Enter your email for immediate access. No credit card. No catch. | EmailCapture default subtitle | change | P4 reassurance. Suggest "Enter your email and the links come to your inbox." | |
| S16 | Get Free Access | EmailCapture default button | keep | Fine. | |
| S17 | You're in! Explore your free tools below. | EmailCapture default success | keep | Fine where the tools are below. | |
| S18 | Email address | form label | keep | Label. | |
| S19 | Save time. Make more money. AI-powered consulting and automation tools for business owners. | meta description (search snippet) | change | First half is P11; "AI-powered consulting and automation tools" sells the vehicle (P5). Suggest: "Save time. Make more money. Custom systems that take the manual and repetitive work off a business owner's plate." (your subhead, 09-04) — needs your words. | |
| S20 | Loading booking calendar… | /book, /consulting | keep | Loading state. | |
| S21 | Assessment UI strings (buttons, recap, account-gate card) | DiscoveryAssessment (client-only) | pending | Owned by the discovery-assessment session; extract from source when we reach it. | |
