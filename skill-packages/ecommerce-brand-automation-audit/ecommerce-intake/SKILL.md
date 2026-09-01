---
name: ecommerce-intake
description: Run an interactive ecommerce brand discovery conversation using the 5 Questions Framework at the owner's chosen pace (fast Quick Pass or rich Deep Dive), then structure what's gathered into a recap, Function Map, data-gaps list, and same-day quick-wins shortlist — all written to audit.json. Use whenever the user is preparing for or running a discovery call for an ecommerce/FBA/Shopify brand, wants the right questions to ask, is onboarding a brand to assess, or says "run the discovery call", "what should I ask", "interview me about my brand", "structure what I know", or "what info do I still need". Stage 1 of the ecommerce-brand-audit pipeline; always runs first because everything downstream is built from these answers. Interactive by default — it asks the owner the questions one at a time and listens, rather than inferring answers from context.
---

# Ecommerce Intake

Stage 1, and the most important. Everything downstream is built from what you gather here. The goal is not to fill a form — it's a real discovery conversation that makes the owner feel deeply understood, and whose answers literally become the plan.

**This skill is interactive by default. You ask the owner questions and wait for answers. You do not infer the answers from context and proceed silently.** If you're about to produce a Function Map or gaps list without having asked anything, stop — that's the failure mode this skill exists to prevent.

## First move: set the pace

Before the questions, offer the two paths (see the orchestrator's `references/two-path-protocol.md`). This is what keeps intake low-friction:

> "Two ways we can do this. Fast — short questions, quick answers, first read in fifteen minutes. Or deep — you talk, I listen and dig in. We can mix. Which feels right to start?"

Then honor it per question. In **Quick Pass**, ask one or two, take short answers, and when the owner doesn't know a number, tell them to just guess — capture it as `confidence:"guess"` and move. In **Deep Dive**, let a rich answer run and drill with the category bank. Read which mode the owner is in and match it. Also ask the data-maturity qualifier once — "do you know your CM3 / daily operating cost off the top of your head?" — to route financial depth (Path A: build the baseline together; Path B: collect and validate fast).

## The spine: the 5 Questions Framework

The backbone is the 5 Questions in `references/5-questions-framework.md` (ecommerce-framed). **Read it before running intake.** Ask the five in fixed order, one at a time, then listen. Don't propose until all five are asked.

1. **What's the biggest problem in the business right now?** — For ecommerce, often anchors on the leaking funnel stage. The core pain in their words; the spine of everything.
2. **How much is that costing per month?** — Dollars, or time converted to dollars. Reveals whether they value solving it. (Quick Pass: a rough guess, flagged. Path A: "TBD, let's build it.")
3. **How long have you had this problem?** — Chronic or new? Tried and failed before?
4. **If you do nothing, what do the next 6–12 months look like?** — Cost of inaction; the stakes.
5. **If you had a magic wand, what would the perfect solution look like?** — Their ideal outcome, success metrics, must-haves, dealbreakers — defines what to propose.

After all five: **recap in their own words** (problem → cost → duration → consequence → vision) and confirm. That recap is the bridge to the rest of the pipeline.

## Drilling down: the 11 categories as a reservoir

The five questions are the spine; the 11 categories in `references/discovery-questions.md` are the drill-down reservoir you pull from when an answer needs depth — heaviest used in Deep Dive. You are not marching through 11 as a checklist; you follow the thread the owner opens.

The 11: Vision & OBG · Customer/Avatar · Product line · Financials · Channel · Marketing & funnel · Brand & audience · Operations & fulfillment · Team & time · Tools & systems · Competitive context. By the end you want enough coverage that downstream stages have what they need. A still-blank category that matters is a data gap to name — or a question to ask before you close.

## The non-negotiable rules

1. **Ask the owner; don't assume.** Discover whether the brand is healthy or struggling, what the goal is, what's broken. The first job is to learn the OBG, not confirm an imagined problem.
2. **Ask, then listen.** One or two questions, then stop. Listen 70%, talk 30%.
3. **Push past surface answers.** Thin answer → probe once ("tell me more about that"). Watch red flags: "no problems," can't quantify cost, "tried everything," vague vision.
4. **Push past the product.** When a pain is described in terms of the current product, ask for the pain that exists *regardless* of the product — that's where new opportunity lives. (Real-call technique: the owner kept answering "my cards get damaged"; the interviewer pushed until he reached "I forget a key card and feel like an idiot at game night" — a situational pain the product can speak to.)
5. **Get the time data.** Where the owner's hours go is the most diagnostic input — and for any "free up my time / what to automate" engagement, it *is* the input. Tracked export preferred; flagged estimate otherwise. Ask them to start tracking going forward.

## Working from documents or a recording (analysis mode)

Sometimes the owner hands over data (P&L, listings, ad reports, time exports) or the audit is built from a recorded call — pull the transcript/summary directly when a Fathom recording is referenced. Ingest and map to the same structure, writing metrics with their source. But documents rarely answer the five questions — especially cost-of-inaction and the magic-wand vision. Where they leave the spine unanswered, ask. Don't let a stack of files substitute for the conversation that produces the plan.

## Outputs (write all to audit.json)

1. **The recap** — the five answers in the owner's words, confirmed. First, because it's what makes them feel heard and is the seed of the plan.
2. **The Function Map** — the standard business functions scored for risk and ownership: `| Function | Owner | Risk (Low/Med/High/Critical) | Hrs/wk | Key Note |` across Finance, Sales/Marketing, Customer Service, Operations/Fulfillment, Admin, IT/Systems, Product/R&D, Purchasing/Vendors. Below it, the top 3 critical gaps with reasoning.
3. **Data gaps** — specific missing facts (CM3, velocity, lead times, landed cost, CAC/LTV, the OBG if still unclear). Mirror these into `unknowns[]`. Never invent; where any is material, ask before proceeding.
4. **Same-day quick-wins shortlist** — a tight 3–5 item list of the most obvious low-effort/high-result opportunities surfaced, drawn from the Q1 problem and Q5 vision. Hypotheses to validate, stated honestly; flag which depend on still-missing data.

## Handoff

Once the recap is confirmed and gaps named, hand off to `constraint-mapping`. Carry the five-question answers and the populated `audit.json` forward. Tell the owner the open data gaps before proceeding — everything downstream inherits those caveats.
