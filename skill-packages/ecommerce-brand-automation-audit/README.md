# Ecommerce Brand Audit — Skill Set

A five-skill set that runs a complete strategic assessment of an ecommerce / Amazon FBA / Shopify brand — your own or a client's — from a low-friction discovery conversation through a prioritized, reasoned roadmap whose every number is traceable to something the owner actually said.

## The five skills

| Skill | Stage | Produces |
|---|---|---|
| `ecommerce-brand-audit` | Orchestrator | Routes the four stages; holds the shared `audit.json`, the two-path protocol, the ecommerce context, and the honesty discipline |
| `ecommerce-intake` | 1 | Recap, Function Map, data gaps, same-day quick-wins shortlist |
| `constraint-mapping` | 2 | Constraint map, the one binding constraint, compound constraints, attack sequence |
| `opportunity-prioritization` | 3 | Ranked opportunity matrix + explicit kill list, ROI routed by data maturity |
| `roadmap` | 4 | Capacity-sized, time-phased plan with success/failure criteria and governance |

Each stage reads from and writes to one shared `audit.json` (schema in `ecommerce-brand-audit/references/audit-json-schema.json`), so nothing gets lost and every claim stays traceable.

## What it is and isn't

It is **neutral about the brand's condition** — it discovers whether the goal is profitability, growth, scale, freeing the owner's time, a launch, or an exit, and builds toward *that*. It is built to **fight scope creep**: end at a short, ranked, bounded list of what to actually do, everything else explicitly deferred.

## The two design choices worth knowing

**Two paths, the owner's choice.** The audit runs as a conversation, not a form. The owner picks the pace — Quick Pass (fast, short answers, "just guess and move") or Deep Dive (they talk, you listen and drill) — and can switch per question. A separate data-maturity dial routes how deep the numbers go (Path A: build the baseline together; Path B: run their real figures). This is what keeps it low-friction without losing depth. See `ecommerce-brand-audit/references/two-path-protocol.md`.

**Source-on-every-metric.** Every number in `audit.json` is a `{value, source, confidence}` object — you structurally cannot record a figure without recording where it came from. A flagged estimate (`confidence:"guess"`) is fine; an invented figure presented as fact is not; ROI stays "TBD" until the owner provides a baseline.

## Provenance

This set merges two source bundles plus a real FBA discovery call:
- the staged-pipeline architecture and discovery discipline from the brand-audit skills (the cleaner design);
- the structured `audit.json` artifact, the ROI Path-A/B model, and the ecommerce content layer (8-stage funnel, baseline metrics, pain-point library, opportunity catalog, connected MCP tools) from the ecommerce-audit bundle;
- the source-traceable metric shape (each metric carries its own quote), which best embodies the never-fabricate-numbers principle both bundles insist on.

Note: the few-shot examples shipped in the source bundle are *non-ecommerce* (a dev shop, an equipment-share, sheds, a retail apothecary). They're useful for structure, misleading for content. The ecommerce grounding here comes from the live FBA discovery call, where the methodology shows up in the wild — vision → customer → segment → pain-past-the-product → vision; "just guess and move" on unknown numbers; "I'd love a list of everything, ranked" as the deliverable owners want; and "when I focus on one thing, everything else falls apart" as the founder-time binding constraint.

## Install

Drop each skill folder into your skills directory. The orchestrator triggers on audit/assessment intents and routes the rest; you can also invoke any stage directly.
