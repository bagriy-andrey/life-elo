# Handoff

Shared state between agents (Claude Code / Codex). Keep it short and current; overwrite stale content.

## Current task
Prepare the UI for Claude Design sync (`/design-sync`, run by the user).

## Done
- Tokens extracted to `src/ui/tokens.css` (color, type, spacing, radius; light + dark).
- Components in `src/ui/components/` (each with its own CSS): Button, Card, Banner, Pill,
  SegmentedControl, EloScore, TabBar, HistoryEntry. Barrel: `components/index.ts`.
- Home / Review / Habits / App migrated to components; intended to look identical.
- `npm test`, `npm run lint`, `npm run build` pass.

- Claude Design sync done (2026-10-31): 8 components uploaded to project "Life Elo"
  (https://claude.ai/design/p/67c2bfac-e6da-422e-98bb-a3415b430a31). Sync inputs live in `.design-sync/`
  (config, NOTES.md, conventions.md, previews/, build-lib.mjs); see `.design-sync/NOTES.md`.

## Next step
- After changing components/props/tokens: re-run `/design-sync` (re-sync; it reads `.design-sync/`).
  Prop types for 5 components are hand-written in `.design-sync/config.json` (`dtsPropsFor`), so keep them in step.

## Decisions & open questions
- Plain CSS per component + CSS variables; no CSS-in-JS / Tailwind.
- Text input still styled globally in `src/index.css` (no TextInput component yet).

## Branch / state
- Branch: `design-system`
- Tests/lint/build: passing
