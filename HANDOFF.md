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

## Next step
- User checks the app visually (`npm run dev`), then runs `/design-sync` to push the components
  to a Claude Design design-system project.

## Decisions & open questions
- Plain CSS per component + CSS variables; no CSS-in-JS / Tailwind.
- Text input still styled globally in `src/index.css` (no TextInput component yet).

## Branch / state
- Branch: `design-system`
- Tests/lint/build: passing
