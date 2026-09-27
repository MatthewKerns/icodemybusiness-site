---
name: dig
description: >
  Pull up the single most important ICMB task Matthew can do right now and put everything he needs
  to start it on one screen: the task, its comments and checklist, what it depends on, the related
  PRs/branches/files, and a concrete first move. Picks from the ranked queue written by /check-in
  (re-running it when stale) and skips anything blocked, waiting on someone else, or not his. One
  task per run; read-only until Matthew says go. Use when Matthew says "/dig", "dig", "what should I
  do now", "next task", "what's the most important thing", or "dig into <task>".
allowed-tools: [Read, Bash, Grep, Glob, AskUserQuestion]
---

# Dig: the one task to do right now

**One task.** A dig never widens to a second task. If the context shows the top task is blocked,
already done, or wrong, that finding is the output and the dig moves to the next candidate.

## 0. The queue

1. Read `~/.claude/skills-state/icmb-check-in/priorities.json`.
2. If it's missing or `generated_at` is older than **4 hours**, run the `/check-in` skill first
   (its § 1–2 and § 5 are enough; say you're refreshing).
3. If Matthew named a task ("dig into <name|id|link>"), use that one and skip § 1.

## 1. Pick: the highest-ranked task he can do *right now*

Walk the queue in rank order and take the first task that passes **all** of these:

| Check | Fails when | How to check |
|---|---|---|
| Still open | status is `complete`/closed | `clickup_get_task` (fresh — the queue can be hours old) |
| His | assigned only to someone else | `assignees` |
| Unblocked | a `blocked_by` dependency is still open, or the description says it waits on a person/deploy/approval that hasn't happened | `clickup_get_task include: ["dependencies"]`; then the thing it waits on (PR merged? deploy landed? decision answered?) |
| Not already done | the live state shows it done (PR merged, file exists, deploy stamp matches) | `gh pr view`, `git log origin/main`, VPS `DEPLOYED_SHA` |
| Doable now | needs something only available elsewhere (a meeting, another person, a device, a paid upgrade he hasn't approved) | description + checklist |

For each task skipped, keep one line: `rank · name · why skipped · what would unblock it`. Stop at
the first pass. If none of the top 10 pass, say so, show the skip list, and name the single
unblock action that frees the most of them.

`[candidate]` tasks are never picked (they're awaiting Matthew's Saturday choice); list 01 decisions
**are** pickable — deciding is work only he can do.

## 2. Gather: everything on this one task

Parallel, read-only:

- **ClickUp:** `clickup_get_task` (`include: description, checklists, dependencies, linked_tasks,
  subtasks`) and `clickup_get_task_comments`. Parent task if it has one. Count calls (shared cap).
- **Repo:** `git fetch -q origin`; `gh pr list -R MatthewKerns/icodemybusiness-site --search
  "<keywords>" --state all`; `git log origin/main --oneline -20 --grep "<keyword>"`; `git grep` for
  the files/areas the task names. Note open branches/worktrees that match (`git worktree list`).
- **Team board:** `docs/developer/kerns/active/team/board.md` — the `T#`/`D#` row for this task and
  who holds it. `ListAgents` if a peer session owns part of it; read its transcript tail before
  relaying its state.
- **Mango repo** (`MatthewKerns/mango-income-tool`) when the task sits in list 20 Brain or cites
  `docs/agency/*`.
- **Docs:** only the doc the task links or names (runbook, OFFER.md, copy-principles.md for any
  visitor-facing copy). Never bulk-load docs.

## 3. Output — one screen

```
DIG  <task name as link> · <list> · rank <n> (rule <r>) · due <date|—> · <status>

WHY THIS ONE   <one line: the rule that ranked it + what it unblocks>
DONE WHEN      <the task's own acceptance, or [PROPOSED] <one line> if it has none>
CONTEXT        <≤6 bullets: the decision/background that matters, each with its source>
DEPENDS ON     <each dependency · state · evidence>
IN FLIGHT      <PRs / branches / worktrees / peer sessions already touching it>
FIRST MOVE     <the concrete first action — a command, a file to open, a decision to make with the options>
GATES          <any AGENTS.md ask-first item this will hit: schema, env, route, dependency, copy claim, deploy>
SKIPPED        <rank · name · why · unblock>   (only if any were skipped)
```

Then ask one question: **start it here** (plan mode first for anything that edits code), **hand it to
a peer session** (name which), or **pick another**.

## 4. Record

Append one line to `~/.claude/skills-state/icmb-dig/log.jsonl`:
`{"at": "<ISO UTC>", "task_id", "name", "rank", "skipped": [ids], "decision": "start|handoff|other|none"}`
so the next dig can tell what was already surfaced.

## Rules

- Read-only until Matthew picks "start it here". No ClickUp status changes, comments or assignments
  from this skill — ever. If the task turns out done, say so with evidence; Matthew closes it.
- One task per run.
- ICMB workspace only (`90141695233`); if `/check-in`'s pre-flight says ClickUp is on another
  account, stop.
- Agents never author business claims (`docs/copy-principles.md` §2): a task that needs visitor copy
  gets a FIRST MOVE of "draft for Matthew", not finished copy.
