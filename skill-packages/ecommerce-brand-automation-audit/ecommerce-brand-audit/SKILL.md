---
name: ecommerce-brand-audit
description: Orchestrate a full strategic assessment of an ecommerce / Amazon FBA / Shopify brand — from discovery conversation through a prioritized, reasoned roadmap. Use whenever the user wants to assess, audit, diagnose, or plan for an ecommerce brand (their own or a client's/partner's), prep for or run a discovery call, find the quick wins, figure out what's holding a brand back or where its opportunities are, free up the owner's time, address scaling, or produce a ranked opportunity list. Trigger on "audit my store/brand", "assess this ecommerce business", "run a discovery call", "what should this brand focus on", "find the quick wins", "what's the bottleneck", "rank these opportunities", "build a plan for this brand", "how do I free up time in my business". Parent that routes four stages (intake → constraint-mapping → opportunity-prioritization → roadmap); invoke it even when the user names only one stage, so the pieces stay coherent and write to one shared audit.json.
---

# Ecommerce Brand Audit (Orchestrator)

This skill runs a complete strategic assessment of an ecommerce brand and produces a prioritized, reasoned plan whose every number is traceable to something the owner actually said. It combines a staged, fight-scope-creep pipeline with a structured single-source-of-truth artifact and an ecommerce-native content layer.

It works on **two subjects** — the user's own brand, or an external brand (client, partner, prospect) — and in **two modes**: *discovery mode* (gathering live, e.g. on a call) and *analysis mode* (data already in hand, producing deliverables).

The assessment is **neutral about the brand's condition.** Do not assume struggling, unprofitable, or in need of turnaround. It may be healthy and wanting to grow, profitable but under-leveraged, time-starved, or genuinely in trouble — you don't know until you ask. The pipeline builds toward *whatever the owner's actual goal is*: profitability, growth, scale, freeing the owner's time, a launch, or an exit.

The single most important job of this skill is to **fight scope creep**. Ecommerce owners — and the people auditing them — inflate scope, chase the grand vision, and add tracks. The whole point is to end at a *short, ranked, reasoned list of what to actually do*, with everything else explicitly deferred. If the output isn't prioritized and bounded, the audit has failed.

## What this set combines

It is the merge of two source bundles plus a real FBA discovery call:
- The **staged pipeline architecture** and discovery discipline (the cleaner of the two designs).
- The structured **`audit.json`** artifact (`references/audit-json-schema.json`) as the single source of truth every stage reads and writes — nothing gets lost, everything is traceable. Source-traceability is native: every metric carries `{value, source, confidence}`.
- The **ecommerce content layer** (`references/ecommerce-context.md`): the 8-stage funnel, baseline metrics, pain-point library, opportunity catalog, and connected MCP tools.
- The **two-path protocol** (`references/two-path-protocol.md`): the low-friction mechanic letting the owner answer fast or go deep, per question.

## The pipeline

Four stages, each its own skill. Read the relevant stage skill when you reach it — don't hold all four in memory at once. All four read and write the same `audit.json`.

1. **`ecommerce-intake`** — Gather and structure inputs via the 5 Questions spine (problem → cost → duration → cost of inaction → ideal solution), drilling into 11 ecommerce categories as answers warrant, at the pace the owner chooses. In analysis mode, also ingest P&L, listings, ad reports, time exports, or a Fathom transcript. Produces the recap, Function Map, data-gaps list, and a same-day quick-wins shortlist. Always first — and actually ask; don't infer.
2. **`constraint-mapping`** — Theory of Constraints. Score the 8 ecommerce constraint categories plus the 5 Core Pillars lens, name the *one* binding constraint, identify the compound constraints, produce an attack sequence. Needs intake data first.
3. **`opportunity-prioritization`** — Generate opportunities, then rank through OBG-alignment + 4L + impact/effort + platform-risk, with ROI routed by data maturity (Path A/B). Produces the ranked matrix and the explicit Kill List — the deliverable an owner most wants.
4. **`roadmap`** — Sequence P0–P2 opportunities into a time-phased plan sized to *real* capacity, quick wins first, with single-variable test discipline, honest success/failure criteria, and a governance mechanism so it actually gets executed.

## How to route

Figure out where the user is and start there — but default to running in order, because each stage feeds the next.

- "Prep for / run a discovery call" → discovery mode, `ecommerce-intake`. Don't produce downstream deliverables until data exists.
- "Here's everything about [brand], what should they do?" → full pipeline.
- "What's the bottleneck / what's holding us back?" → `ecommerce-intake` (if data thin) then `constraint-mapping`.
- "Rank these / what are the quick wins?" → `opportunity-prioritization` (confirm binding constraint first).
- "Build the roadmap / how do we execute?" → `roadmap` (requires prioritized opportunities + real capacity).

**Checkpoint gates (every stage).** Each stage starts by inventorying what it knows versus what it needs. If a *material* input is missing — one that would change the stage's conclusions — the stage stops and asks the owner, discovery-call style, before producing anything. No stage fabricates a missing input to keep moving. One good question beats a deliverable resting on a guess.

## The Discovery Protocol (shared — all stages inherit this)

These skills run like a discovery call, not a desk audit. Default to engaging the owner and eliciting what's needed, not quietly working from scraps in context.

- **Speak to the owner.** Frame every question as if talking to the brand's owner. One audience.
- **Two paths, the owner's choice.** Offer Quick Pass (fast, short answers, "just guess and move") or Deep Dive (they talk, you listen and drill), and match whichever they're in — per question. See `references/two-path-protocol.md`. This is what keeps it low-friction.
- **Ask, then listen.** One or two questions, then stop. Listen 70%, talk 30%. The best detail comes after a pause.
- **Push past surface answers**, and **push past the product** — the pain that exists regardless of the current product is where new opportunity lives.
- **Get the time data.** Where the owner's hours go is the most diagnostic input, and for any "free up my time / what to automate" engagement it *is* the input.
- **Recap in their words** before moving from gathering to analysis. Their answers become the plan.

## Default frameworks (the preset lens — name them when you use them)

- **OBG (One Big Goal)** — every brand gets one, **discovered, never assumed.** Don't default to "make it profitable"; ask what winning looks like. Every opportunity traces to the *stated* goal or gets flagged.
- **Two Pillars** — Pillar 1: Asset Optimization (revenue from existing inventory: listing, price, PPC). Pillar 2: Product R&D (future growth). Both get attention.
- **Theory of Constraints** — exactly one constraint binds at a time. Solve it, the next binds. Don't attack non-binding constraints because they're easier.
- **4L Filter** — Low Human, Low Capital, Low Complexity, Low Tech. Favor interventions low on all four.
- **5 Core Pillars (assessment lens)** — New Product Dev, Launching, SKU Optimization, Amazon PPC, Audience Utilization. Score 1–5, attack the lowest.
- **Platform-risk / white-space test** — for tooling/automation, ask whether a platform (Amazon itself, a Titan-style tool, a general AI assistant) will subsume it. Defensible white space beats building something that gets eaten.
- **Spartan Rule** — one obsession; brutal elimination of the rest. The Kill List is a first-class deliverable.

## Honesty discipline (non-negotiable)

- **Assume nothing beyond what the owner has stated or shown.** The cardinal rule. Don't assume the brand is unprofitable, that growth is the goal, that cash is tight, or that anything specific is broken until it's stated or in the data. When it matters and you don't know, it's a gap to ask about, not a blank to fill.
- **Never fabricate or extrapolate numbers.** "Busy" ≠ "70 hrs/week"; "manual process" ≠ "30 min/task." Missing → `value:null`, `confidence:"unknown"`, add to `unknowns[]`. An owner's flagged estimate (`confidence:"guess"`) is fine; an invented figure presented as fact is not. ROI stays "TBD" until the owner provides a baseline.
- **Every metric is traceable** to a quote, a document, or a tool read. The schema enforces this by shape.
- **The OBG is discovered, not assumed.** Build the plan toward the goal the owner named.
- **Name scope creep when it happens** — in the owner, in the user, in yourself. The instinct to add a track or chase the grand vision is the thing to resist.
- **Distinguish the binding constraint from the visible one.** The loudest problem is rarely the binding one; founder time allocation often is — but confirm with data.

## Output

Match the deliverable to the stage and audience, per the environment's file conventions (inline for conversational answers; files for artifacts the owner keeps or shares). Maintain `audit.json` as the running source of truth throughout.

- After a **discovery call**: intake summary + same-day quick-wins shortlist. Don't dump the full suite after one conversation.
- As it deepens: constraint map → ranked matrix + kill list → roadmap → governance, in that order.
- For a **full analysis** with data in hand: the complete suite, all reading from and writing to one `audit.json`.

Keep prose clean — minimal bolding, reasoning visible, no wall-to-wall bullets.
