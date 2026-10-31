---
name: handoff
description: "Saves the current state so another agent (Claude Code or Codex) can continue: rewrites HANDOFF.md and makes a wip commit. Run manually with /handoff when limits are running out or before stopping."
user-invocable: true
---

# Handoff

Goal: the next agent resumes with zero chat context, losing at most the current step.

1. Rewrite `HANDOFF.md` (overwrite, ≤20 lines, no history) in this shape:
   ```markdown
   # Handoff
   Updated: <YYYY-MM-DD> by <Claude Code | Codex>
   Branch: <branch>
   Plan: <docs/plans/NN-slug.md, step k of n> | none
   ## In progress
   <what is half-done in the working tree, or "nothing">
   ## Next step
   <one concrete action; e.g. "/build-plan docs/plans/02-x.md" or "finish step 3: …">
   ## Broken / open questions
   <failing test/lint with reason; questions for the user; pending /design-sync>
   ```
   Durable lessons do not go here — add them to "Gotchas" in `AGENTS.md` (compress, don't grow).
2. Run `npm test` and `npm run lint`; record failures in "Broken" instead of fixing them now.
3. Commit everything: `git add -A && git commit -m "wip: <short state>"` (or `handoff: …` if
   only HANDOFF.md changed). Do not push unless the user asks.
4. Reply with one line: branch, commit hash, next step.
