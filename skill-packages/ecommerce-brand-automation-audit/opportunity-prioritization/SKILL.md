---
name: opportunity-prioritization
description: Generate and rank improvement opportunities for an ecommerce / FBA / Shopify brand, producing a prioritized matrix and an explicit kill list, with ROI routed by the owner's data maturity. Use whenever the user wants to know what to work on, what the quick wins are, how to rank a list of ideas, what to do first vs. defer, or what NOT to do. Trigger on "what are the quick wins", "rank these opportunities", "what should I prioritize", "what should I work on first", "build me a prioritized list", "what's the highest-leverage move", or "what should we kill". Stage 3 of the ecommerce-brand-audit pipeline. Needs the binding constraint from constraint-mapping as its ranking lens, and produces the deliverable an owner most wants — a ranked list with reasoning, plus a kill list. Scores through OBG-alignment, the 4L filter, impact/effort, and the platform-risk test.
---

# Opportunity Prioritization

Stage 3 — turns diagnosis into a decision. The output most owners actually want is "a list of everything, ranked by what matters most" — but the value is in the *reasoning* behind the ranking and in the explicit kill list, not the list itself. (Heard verbatim in a real call: "I would love a list of everything and then be able to rank it based on what's actually most important — the tough part is prioritizing.")

The core discipline: a quick win is low-effort AND high-result AND addresses the binding constraint. An opportunity attractive in isolation but not touching the binding constraint gets ranked down, no matter how appealing.

## Inputs required

- The Function Map and data gaps from `ecommerce-intake`.
- The five-question answers — especially the Q5 magic-wand vision (what they want built) and Q2 cost (what they value).
- The binding constraint and attack sequence from `constraint-mapping`. **This is the ranking lens.** Without it, get it first — ranking without the binding constraint produces a pretty but wrong list.
- The stated OBG. Ranking scores against the owner's actual goal.

**Checkpoint gate:** if the binding constraint, the OBG, or the magic-wand vision is missing, **stop and ask** before producing a ranked list. A ranked list built without knowing what the owner wants or what's binding is confident-looking noise.

## Generating opportunities

Generate broadly, then rank. Pull from: the owner's Q1 problem and Q5 vision (what they came for); the critical gaps in the Function Map; the binding and compound constraints (highest-value opportunities almost always address these); the lowest of the 5 Core Pillars; broken funnel links from intake (dead QR codes, broken email capture, missing video, generic main image, mis-targeted imagery); and the ecommerce opportunity catalog in the orchestrator's `references/ecommerce-context.md`. Lean into zero/near-zero-cost levers — they're disproportionately valuable for cash-constrained brands. Aim for a complete list before ranking; don't pre-filter.

## The scoring lenses

Score every opportunity through four lenses; detailed rubric in `references/scoring-rubric.md`.

1. **OBG-alignment** — serves the owner's *stated* goal (High/Medium/Low). Whatever it is — margin, growth, scale, time-freedom, launch — score against that, not an assumed profitability goal.
2. **4L filter** — Low Human, Low Capital, Low Complexity, Low Tech. Favor low-on-all-four, especially for a solo/cash-constrained operator.
3. **Impact / Effort** — quick wins are High impact / Low effort; strategic bets are High/High (slot later); Low impact / High effort goes on the kill list. Be honest about effort — a "quick" listing overhaul that needs new photography, copy, and A+ is not low effort.
4. **Platform-risk / white-space test** — will a platform (the marketplace, a Titan-style tool, a general AI assistant) subsume this? Defensible white space beats building something eaten in six months. High-effort AND high-platform-risk is usually a trap.

## ROI — routed by data maturity (see references/roi-model.md)

ROI depth follows the qualifier from intake. **Path A (owner doesn't know their numbers):** keep ROI as "TBD until baseline provided," build the baseline collaboratively, never manufacture a figure. **Path B (owner knows):** run their real numbers through the model and attach a figure with the inputs used. Either way, ROI claims are traceable to owner-provided baselines, never invented.

## The ranked matrix (write to audit.json `opportunity_matrix`)

`| # | Opportunity | Funnel stage | Impact | Effort | OBG fit | 4L | Platform-risk | Addresses binding? | Priority |`

Priority tiers: **P0** immediate blocker/foundational; **P1** advances OBG this quarter, addresses binding constraint; **P2** supporting; **P3** strategic but not urgent; **Kill** explicitly rejected to protect focus. Order by priority. For top items, a sentence of reasoning each — *why* this rank.

## The Kill List (a first-class deliverable, written to audit.json `kill_list`)

As important as the ranked list — it's what protects focus. One-line reason each. Common entries: opportunities that don't address the binding constraint and aren't quick wins; channel expansion before cash is stable; building tooling a platform will subsume (failed platform-risk test); anything intended for months without execution (more tools won't fix a time problem); grand-vision features that should wait until a simpler version is proven. Name scope creep explicitly. When the owner reaches for the big build, the kill list is where you hold the line: prove the simple version first.

## Quick-wins shortlist

Early in an engagement (e.g. right after discovery), also produce a tight 3–5 item quick-wins shortlist — highest impact / lowest effort items that address the binding constraint. Mark which depend on still-missing data. Hypotheses to validate, stated honestly.

## Handoff

Hand off to `roadmap`, which sequences the P0–P2 opportunities into a time-phased plan — quick wins first — with capacity limits and success criteria. The kill list travels with the handoff so deferred items don't silently creep back in.
