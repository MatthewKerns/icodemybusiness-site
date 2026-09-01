# The Two-Path Protocol

This is the mechanic that makes the audit low-friction without sacrificing depth. It is inherited by every stage. The owner is never trapped in one mode — they choose, per question, how much to give, and the audit adapts.

There are two independent dials. Don't conflate them.

## Dial 1 — Pace (how the owner answers each question)

Offer this explicitly at the start of intake, and honor it question by question. The owner can switch any time.

**Quick Pass** — one or two questions at a time, short answers, keep moving. The owner answers in a sentence, or says "I don't know," and the audit moves on. This is the low-friction path to a usable first read in ~10–15 minutes. The rule that makes it work, taken straight from a real discovery call: when the owner doesn't know a number, **"all you need to do is just guess"** — capture the guess, tag it `confidence: "guess"`, and move. A flagged estimate is not a fabrication; a silent gap left as `unknown` is honest too. What you never do is invent a number and present it as known.

**Deep Dive** — the owner opens a question and pours in everything: the full story, the history, the adjacent ideas. Here the job flips to listening and drilling. Follow the thread with the 11-category reservoir; probe past surface answers ("tell me more about that"); push every pain past the product. One real call spent ten minutes on a single question — customer segmentation — and that depth became the spine of the whole proposal. Let it run when the owner is generative; don't cut a rich answer short to stay on schedule.

**Mixed (the realistic default).** Most audits are Quick Pass on questions the owner doesn't care about or know, Deep Dive on the two or three they light up on. Record which mode produced each section in `_metadata.pace_mode_used`. The skill's job is to *read which mode the owner is in* and match it — fast when they're terse, spacious when they're generative — not to force a uniform depth.

How to open it (use the owner's framing, not jargon):
> "Two ways we can do this. Fast — I fire off short questions, you answer quick, we get a first read in fifteen minutes. Or deep — you talk, I listen and dig in wherever there's something rich. We can mix: go fast until something's worth slowing down for. Which feels right to start?"

## Dial 2 — Data maturity (how deep the numbers go)

This routes the financial and ROI depth, and it's a separate question from pace. It comes from the ROI calculator's qualifying question:

> "Do you know your daily operating cost / your CM3 off the top of your head?"

**Path A — they don't know (most owners).** Normalize it ("totally normal, most owners don't track this"), and treat the discovery itself as part of the value — you're helping them see their own numbers. Build the baseline collaboratively. Mark every unknown metric `confidence: "unknown"` and add it to `unknowns[]`. ROI stays `"TBD until baseline provided"`. Do not manufacture a baseline to produce a clean ROI figure — a plan built on invented economics is worse than one honest about its gaps.

**Path B — they know their numbers (rare).** Acknowledge it ("that's rare — means we can move faster"), collect the metrics, validate quickly, and ROI becomes a real conversation with their own figures. The owner owns the numbers; you provide the framework.

The two dials combine freely: a Path-A owner can still Deep Dive on brand vision; a Path-B owner can Quick Pass through operations. Pace is about *talking style*; data maturity is about *what's measurable*.

## Why two paths and not one

A single fixed depth fails both ways. Force depth on a Quick-Pass owner and they disengage before you reach the question that matters. Force speed on a Deep-Dive owner and you cut off the ten-minute answer that was the whole point. The audit is a conversation, not a form — its quality comes from matching the owner's energy, and from being honest about what's a stated fact, what's a flagged guess, and what's still unknown.
