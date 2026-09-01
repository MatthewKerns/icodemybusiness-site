---
name: roadmap
description: Sequence prioritized opportunities into a time-phased execution plan for an ecommerce / FBA / Shopify brand — ordered from quick wins to longer-term plays — with capacity limits, success and failure criteria, and lightweight governance. Use whenever the user wants to turn a prioritized list into a roadmap, build a quarterly or multi-week plan, sequence work from quick wins to bigger bets, set up accountability for execution, or lay out a timeline. Trigger on "build the roadmap", "build the plan", "sequence this", "lay out the next 10 weeks", "build a quarterly plan", "how do we actually execute this", "set up accountability", or "turn this into a timeline". Stage 4 (final) of the ecommerce-brand-audit pipeline. Takes the ranked opportunities and kill list from opportunity-prioritization and produces a time-phased roadmap sized to real capacity, with honest success/failure criteria and a governance mechanism so the plan actually gets executed.
---

# Roadmap

Stage 4 — the final stage. Turns the ranked list into a sequence of work over time, ordered quick wins to longer plays, sized to the capacity that actually exists, with honest criteria for success and failure and a governance mechanism that makes the plan real rather than aspirational.

Not necessarily a turnaround — the brand may be healthy and growing. The roadmap sequences whatever the prioritized opportunities are, toward whatever the owner's stated goal is, front-loading high-impact/low-effort wins and placing bigger plays later with realistic timelines.

The hardest truth this stage enforces: **most plans fail not because the strategy is wrong but because there was no mechanism forcing execution.** A roadmap without capacity sizing and accountability is a wish list. (Heard in a real call: "I spent five months on the website and testing affiliates, and nine months passed where I didn't do much on Amazon — by focusing on one thing, everything else fell apart.") This stage exists to prevent that.

## Inputs required

- Ranked opportunities (P0–P3) and the kill list from `opportunity-prioritization`.
- The binding constraint and attack sequence from `constraint-mapping`.
- An honest read on **capacity** — how many hours/week actually exist, split across owner / any team / any budget for help.

**Checkpoint gate:** capacity is the input founders most often get wrong, by overestimating. Don't size against assumed hours. If you don't have a real number, **stop and ask** — "Realistically, how many hours a week can you protect for this?" and "Is that you alone, or is there anyone else's time or budget?" A roadmap sized to fictional capacity fails in week three. If the Q5 vision implied a timeline or a definition of success, confirm it here — it sets the bar the roadmap clears.

## Sizing to real capacity

Where most roadmaps break.
- **Get the real hours**, not aspirational ones. If a founder has historically put near-zero hours into the brand, a plan assuming 20/week is fiction. Size to what the time data shows, or to a committed, tracked number.
- **Track time going forward** so the plan can be checked against reality weekly.
- **Model a ramp explicitly** if hours will increase over time (e.g. as other income work clears), and note what it's contingent on, so it pauses honestly if the precondition slips.
- **Budget hours per track per week.** If the sum exceeds capacity, cut scope. An over-subscribed plan fails in week three.

## Structuring the roadmap

Organize into a small number of parallel tracks (typically 2–4), each mapped to part of the attack sequence. For each: a clear focus and the constraint it addresses; a weekly hour budget; an ordered checklist (~10–12 items per track for a quarter); and a track-specific kill list (what this track will NOT do).

Resist adding tracks — each one dilutes focus and competes for the same scarce hours. Spartan Rule: one core obsession, brutal elimination. If a fourth or fifth track is proposed, that's the moment to name the scope creep. Provide an **hours-by-week heatmap** showing load per track across the horizon, summing to capacity (including any ramp), so over-subscription is visible.

## Single-variable testing discipline

Where the plan involves tests (pricing, images, copy), enforce clean experimental discipline: one variable at a time or the data is uninterpretable; pre-committed decision rules *before* seeing data (e.g. "raise price $1/week only if last week's conversion held; stop if it drops ≥15%"); minimum sample periods before evaluating. This prevents the reactive-changes anti-pattern where short-term softness triggers panic adjustments that destroy the ability to learn.

## Success and failure criteria (be honest about both)

Always include three sets: **Must-haves** (what makes the period a success, tied to the OBG and binding constraint); **Stretch goals** (what excellence looks like); **Failure criteria** (the honest off-ramps — stated in advance: "if hours stay below X for 3 consecutive weeks, rescope"; "if the binding constraint hasn't moved by re-score, the attack approach is wrong"). Naming failure conditions in advance is what makes a plan honest rather than hopeful.

## Governance (what makes the plan real)

A plan needs a mechanism that forces execution. Match it to the engagement:
- **Solo founder:** time tracking + a weekly review cadence + a witness (a peer who sees the numbers). External visibility is the most effective anti-drift mechanism even when the witness enforces nothing.
- **Partnership or paid engagement:** a written agreement with specific deliverables and an accountability layer. If money is involved, keep it honest — tie any compensation to real outcomes (e.g. contribution-margin dollars above a *locked* baseline), cap it so the brand keeps the majority of gains, and lock the baseline so it can't be retroactively adjusted. A baseline that floats enables self-deception.

The governance section is not optional. The whole pipeline is worthless if the plan doesn't get executed, and execution is a function of accountability, not intention.

## Output (write to audit.json `roadmap`)

1. Capacity model — real hours, any ramp, what it's contingent on.
2. Tracks — 2–4, each with focus, hour budget, ordered checklist, track kill list.
3. Hours-by-week heatmap — load per track, summing to capacity.
4. Weekly + monthly cadence — the review rhythm.
5. Success / stretch / failure criteria — all three.
6. Governance — the mechanism that forces execution.
7. What's deliberately not in the plan — the kill list carried forward.

## Closing discipline

End by restating the single most important thing: usually that the binding constraint is the target, that capacity is the limit, and that the plan is real only if the hours get tracked and the governance holds. The plan is the easy part — execution is the whole game.
