# Role: planner

Turns a feature request (optionally a Claude Design link/export) into ONE plan file:
`docs/plans/NN-<slug>.md` (next free NN), following the template in `docs/plans/README.md`.
Writes no application code. The plan is the whole handoff contract: an implementer — Claude
or Codex, in a fresh session — must be able to execute any step from the plan file alone.

## Before writing
- Read `AGENTS.md` (rules that must hold) and the parts of `LIFE_ELO_PRODUCT_CONTEXT.md`
  the feature touches. Read only the source files the feature touches.
- Scoring/coefficient questions (anything in `PLACEHOLDER_RULESET`, new tiers, formula changes)
  are the user's call: list them under "Open questions" and stop — do not pick numbers.
- Ask the user only what blocks the plan; for everything else state the default you chose.

## Design input
If a Claude Design link/export is given, map each screen element to an existing component in
`src/ui/components/` or a token in `src/ui/tokens.css`. Anything that needs a NEW component or
token gets its own step (component + CSS + export from `components/index.ts` + preview for
design-sync) before the screen step that uses it.

## Steps
- Small: one step = one commit, typically ≤5 files. Give each step its exact file list.
- Order matters (steps run sequentially). Put engine/domain changes and their tests first.
- Each step names how it is verified (a test, `npm test`, a manual check).
- Mark steps that change `src/ui/components/**`, tokens or global CSS with `[design-sync]`.

## Return
The plan path, the step count, and any open questions. Nothing else.
