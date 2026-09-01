---
name: constraint-mapping
description: Apply Theory of Constraints to an ecommerce / FBA / Shopify brand — score it against the 8 universal ecommerce constraint categories and the 5 Core Pillars lens, identify the single binding constraint and the compound constraints where categories interact, and produce an attack sequence. Use whenever the user wants to know what's really holding a brand back, what the bottleneck is, what to fix first, why a brand is stuck, or asks for a constraint map. Trigger on "what's the binding constraint", "what's the bottleneck", "what's holding this brand back", "what should we fix first", "why are we stuck", "map the constraints". Stage 2 of the ecommerce-brand-audit pipeline; needs intake data first, feeds opportunity-prioritization. Identifies exactly one binding constraint because that is the discipline of Theory of Constraints.
---

# Constraint Mapping

Stage 2. Theory of Constraints: a system is limited by exactly one binding constraint at a time. Relieve it and a new one becomes binding. The discipline — and the value — is refusing to spread effort across non-binding constraints just because they're more visible or easier.

Takes the intake Function Map and produces a Constraint Map written into `audit.json` under `constraint_map`: every constraint scored, the binding one named, compound interactions identified, attack sequence set.

## Checkpoint gate (before producing anything)

Scoring severity requires real inputs. Confirm you have: the five-question answers (especially Q1 problem, Q2 cost — they tell you which constraints the owner *feels*); enough financial signal to judge Capital (rough revenue, a CM level, cash/debt posture); enough operational signal to judge task-volume (solo vs. team, where time goes); and the stated OBG, so "binding" is judged against the right goal.

If a *material* input is missing — one that would change which constraint is binding — **stop and ask the owner in discovery-call style** before scoring. E.g. "When you think about money tied up in inventory versus cash in the bank, how tight does it feel month to month?" or "When you focus on one area for a week, what falls apart while you're not looking?" Don't assign a severity you're guessing at. When you must proceed with a gap, mark the affected scores `provisional:true` and name the assumption — never present a guessed severity as established.

## The 8 ecommerce constraint categories

Definitions, failure modes, and symptoms are in `references/constraint-framework.md` — read it when scoring.

1. **Capital / Cash Conversion Cycle** — money tied up in inventory before it converts back to cash; the defining financial constraint of physical-product ecommerce.
2. **Inventory** — stockouts vs. overstock; lead times, MOQs, seasonal cutoffs.
3. **Channel** — platform dependency, TOS risk, single-channel exposure.
4. **Brand & Audience** — emotional connection, owned audience, retention vs. paid reacquisition.
5. **Operational (task volume)** — aggregate work against available hours, especially for a solo operator.
6. **Capability** — skill/knowledge gaps (distinct from time).
7. **Market** — competitive intensity, demand ceiling, seasonality.
8. **Regulatory / Structural** — tariffs, duties, TOS compliance, IP, entity.

## Scoring method

Score each on four dimensions: `| Constraint | Severity | Trajectory | Leverage | Binding? |` plus a Note with brand-specific reasoning.
- **Severity** — Low/Medium/High/Critical: how badly it's biting now.
- **Trajectory** — improving/stable/worsening. A worsening Medium can outrank a stable High.
- **Leverage** — Low/Medium/High: can it be attacked with current capacity?
- **Binding?** — if solved, does the next level unlock? Usually only ONE is truly binding.

## Identifying the binding constraint

Usually where Severity is Critical/High AND Leverage is High. Two traps:
- **The visible constraint is rarely the binding one.** "Our branding is weak" or "marketing isn't working" is often a symptom; the binding constraint underneath is frequently *founder time allocation* (operational) or *cash* (capital) — the thing that prevents the branding work from ever getting done. The classic tell, heard verbatim in a real call: "when I move away on something, something falls apart."
- **Two constraints can co-bind.** Operational task-volume and Capital frequently reinforce each other — one person can't execute everything, and there's no cash to hire it out. Name both, but identify which one, if relieved, unlocks the other.

## Compound constraints

The most important insight in most maps is where categories *interact*. Look for:
- **Cash × Lead Time = the stockout trap.** Long lead times force cash commitment months before sales return; tight cash makes it impossible. Neither alone causes it.
- **Task Volume × No Team = the execution gap.** Why good strategy goes unexecuted for years. Solved by multiplying output (AI agents) before a hire is affordable.
- **Brand × Channel = the rented-audience risk.** Weak brand plus single channel means the platform owns the customer.

Name the 2–3 that matter most for this brand.

## The 5 Core Pillars overlay

Cross-check: score 1–5 on New Product Development, Launching, SKU Optimization, Amazon PPC, Audience Utilization; attack the lowest. If the lowest pillar and the binding constraint disagree, reconcile explicitly — usually the binding constraint wins, but the pillar score is a useful sanity check.

## The attack sequence

Order constraints for attack: binding one first, then the next that becomes binding once it's relieved. For each, state how relieving it unlocks the next (the chain reaction). Critically, also state **what NOT to attack yet, and why** — protecting focus is half the value. Channel diversification, capability building, and regulatory over-engineering are common "not yet" items; put them on the deferred list.

## Output (write to audit.json `constraint_map`)

1. Scoring table — all 8, four dimensions, notes.
2. The binding constraint — named, with reasoning; note if two co-bind.
3. Compound constraints — the 2–3 that matter.
4. 5 Core Pillars score — 1–5 each, lowest flagged, reconciled with binding.
5. Attack sequence — order, chain reaction, explicit "not yet" list.

Include a re-scoring note: refresh quarterly; the binding constraint should *move* over time. If it never moves, the attack approach is wrong.

## Handoff

Hand off to `opportunity-prioritization`. The binding constraint is the lens for ranking — an opportunity that addresses it outranks one that doesn't, regardless of how attractive it looks alone.
