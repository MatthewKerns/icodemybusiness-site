# Copy review — the process

Every public, customer-facing line on icodemybusiness.com is reviewed with Matthew,
page by page, line by line, top to bottom. The agent gives a verdict and a reason for
each line; Matthew confirms, changes, or cuts it. Nothing ships without his ruling.
Goal set 2026-09-06 (session "copy").

## Steps, per page

1. **Extract in document order** from the live page (`curl` the route, strip tags, keep
   headings, paragraphs, list items, buttons, links, captions). Add client-only strings
   from source (lazy components, post-click states, SVG labels) where the DOM is silent.
2. **Write the ledger** at `docs/copy/ledger/<route>.md`: one row per line with
   `#`, the text, the agent's verdict (`keep` / `change` / `cut` / `ask`), the reason
   (which principle or preference it rests on), and an empty `Matthew` column.
3. **Review in batches** of a page section (a beat, a card, a form). For each line the
   agent states: keep or not, and why. Matthew rules. His ruling and any replacement
   words go into the `Matthew` column verbatim.
4. **Distil preferences.** Each ruling that reveals a rule ("patronizing", "process
   not outcome", "that's a claim, not mine") is added to `docs/copy/preferences.md` with
   the line that taught it. That file is the corpus new copy is written from.
5. **Ship** the confirmed changes for that page in one commit per page, explicit-sha push,
   deploy hand-off, verify on the live page.

## Principles already in force

`docs/copy-principles.md` (outcomes not process; only Matthew asserts facts about the
business; nothing promised that isn't built; no visible prices; answer objections, don't
soothe; say things once). The preferences file extends it with what the review teaches.

## Page order

`/` → `/book` → `/consulting` → `/services` → `/free-tools` → `/academy` → `/connect`
(+ `/connect/mango`, `/connect/builder-tools`) → `/mango` → `/custom-tools` →
`/assessment` → `/subscribe` (+ success) → `/sign-in`, `/sign-up` → `/portal` (signed-in)
→ shared: header, footer, community banner, social proof bar, email capture, error states.
Noindex pages (`/vsl`, `/testimonials`, `/forbidden`) last.

## Skills this produces

Live in `~/.claude/skills/` (global, per AGENTS.md; `.claude/skills` is gitignored in this repo). Their SKILL.md files are the operating manual for steps 1–5 above.

- `copy-review <route>`: runs steps 1–2 and presents batches.
- `copy-write`: drafts new copy from `preferences.md` + `copy-principles.md`, tags every
  fact with its source, and refuses to author a business claim.
- `copy-lint`: checks a diff of visitor-facing strings against the preferences.
