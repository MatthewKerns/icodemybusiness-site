# Hand-off to `offer` — the client-scores beat (R-024)

_From cmo, 2026-09-08. A hand-off, not a request to write copy yet._

**What Matthew asked for** (video 2026-09-07, transcript `Drive: iCodeMyBusiness/Youtube Content
Plan/Transcripts/AgencyPlanningSept7.txt` T17–T28): the landing page tells the honest story — "we used
to not be as good at this, here's my metrics from before, now a dialed-in system where prioritization
is handled by my agent" — and shows the daily brief, the weekly must-haves per client, the day plan.

**What now exists** (Mango repo, branch `feat/client-scores` @ `8c5a8b9`, pushed, NOT merged or deployed):
- Per-client **Communication score** = cadence + speed + quality, and **Delivery score** =
  progress × timeliness, each 0–10, over a rolling 90 days, for every active client tile. Every layer
  is labelled *measured*, *self-reported* or *model-judged* (the model-judged layer is off until
  Matthew has reviewed it). Exact rules: `mango-income-tool/docs/client-scores/PRD.md` v10 §4.
- A 07:00 line that names the one small task that moves a score ("🎯 Move the score today: …").
- Definitions chosen by Matthew in a planning session on 2026-09-08 — they are his, not an agent's.

**What R-024 still needs before any words go on the site**
1. Mango merged and deployed; `choose_score_definitions` run (`chosen_by: Matthew`); the first refresh.
2. Real figures: the two current scores per shown client, and the "before" computed over older data —
   each traced to a dashboard export Matthew signs. None exist today (the Mango data connector was
   unreachable all day).
3. Matthew's decisions on which clients and which window may be shown (PRD Q10).

**Copy rules that bind this beat** (`docs/copy-principles.md`): only Matthew asserts figures; nothing
promised that isn't built (the dashboard is built; the numbers are not yet); no visible prices.

cmo will follow up with a one-page brief (definitions in plain words, window, clients, before/after
figures with sources) once items 1–3 are done. Until then this beat is **blocked**, not forgotten.
