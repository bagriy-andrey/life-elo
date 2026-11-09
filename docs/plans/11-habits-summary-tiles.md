# 11 — Habits summary tiles

Status: approved
Design input: Claude Design project 67c2bfac-e6da-422e-98bb-a3415b430a31, `templates/habits/Habits.dc.html` (markup summarized below; no fetch needed)

## Why
The Habits screen has no overview of how many habits exist per direction and tier. Add two small
read-only tiles (constructive / destructive) between the header row and the list. No scoring change.

## Acceptance criteria
- WHEN the account has at least one habit THE Habits screen SHALL show, between the header row and the list, `<section aria-label="Сводка по привычкам">` with two `StatTile`s in a 2-column grid (`grid-template-columns: repeat(2, minmax(0,1fr))`, gap 10px).
- WHEN there are no habits THE screen SHALL show only the existing empty state (no tiles).
- THE tile totals and rows SHALL count ALL habits, active and paused (`active: false`), per direction and per tier, where tier = `settingsOn(h, today()).tier` (same as the list).
- THE rows SHALL be ordered Сильные / Средние / Слабые; a count of 0 is shown at opacity 0.4.
- THE tiles SHALL be informational only (no tap, no filter); the list grouping below stays unchanged.
- THE tile labels and aria-label SHALL be translated in ru/en/uk.

## Design mapping
- Tile = card: `background: var(--card)`, `border: 1px solid var(--border)`, `border-radius: var(--radius-md)`, `padding: 14px 16px`, flex column, `gap: 10px`, `min-width: 0`.
- Header: 10px dot (`var(--pos)` / `var(--neg)` by `tone`), label (muted, `--text-sm`, ellipsis), total right (`margin-left:auto`, strong, 1.35rem, line-height 1, tabular-nums).
- Body: `border-top: 1px solid var(--border)`, `padding-top: 10px`, column of rows (gap 6px, `--text-sm`). Row = tier bars icon, muted label, count right (tabular-nums, weight 600, opacity 0.4 when 0).
- Tier bars icon: 3 bars, 3px wide, heights 6/9/12px, radius 1px, `currentColor` muted; bars above `level` at opacity 0.3.
- Reuse check: `SegmentedControl` already draws importance bars (`.segmented-bars`/`.segmented-bar`, heights 7/10/13, `bar-1..3`, `.dim`) inline. Extract them into a small `TierBars` component (`level: 1|2|3`, `size?: 'sm'`; sm = 6/9/12px) used by both `SegmentedControl` and `StatTile`. `TierBars` is internal (not exported from `components/index.ts`, no design-sync props entry); SegmentedControl's output keeps looking identical (default size 7/10/13).
- Existing labels: `tierGroup.strong|medium|weak` («Сильные/Средние/Слабые») are reused for rows. `directionGroup.*` is «＋ Полезные / − Вредные», which does not match the mockup, so add new keys for the tile titles (see step 1).

## Open questions
(none; all answered by the user)

## Steps
- [x] 1. Pure counting helper + i18n — files: `src/ui/grouping.ts` (add `countByDirectionAndTier<T>(items, meta)` returning `{ constructive: { total, strong, medium, weak }, destructive: {...} }`, always both directions, zeros included; same `meta` signature as `groupByDirectionAndTier`), `src/ui/grouping.test.ts` (empty list, mix of directions/tiers, paused counted like active, zeros present), `src/i18n/ru.ts`, `src/i18n/en.ts`, `src/i18n/uk.ts` (keys `habits.summary.aria` = «Сводка по привычкам», `habits.summary.constructive` = «Конструктивные», `habits.summary.destructive` = «Нежелательные»; en/uk translated; ru is the source of truth, follow the file's existing key order/typing) — verify: `npm test`, `npm run lint`.
- [x] 2. [design-sync] `StatTile` shared component + `TierBars` extraction — files: `src/ui/components/TierBars.tsx`, `src/ui/components/TierBars.css`, `src/ui/components/SegmentedControl.tsx` + `.css` (use `TierBars`, remove the duplicated bar CSS, keep the 7/10/13 look), `src/ui/components/StatTile.tsx`, `src/ui/components/StatTile.css`, `src/ui/components/index.ts` (export `StatTile`), `src/ui/components/forms.test.tsx` or a new `src/ui/components/StatTile.test.tsx` (renderToString smoke: title, total, rows with labels/values, `tone` dot class, zero row has the dim class, SegmentedControl still renders `segmented-bar`), `.design-sync/config.json` (`dtsPropsFor.StatTile` and a `cardMode` entry like its neighbours if components have one), `AGENTS.md` (add StatTile to the Gotchas components list). Props: `title: string; total: number; tone: 'pos' | 'neg'; rows: { label: string; value: number; level: 1 | 2 | 3 }[]; className?: string`. Style only with tokens from `src/ui/tokens.css`, plain CSS in its own file. Document props with JSDoc comments in `dtsPropsFor` in the same style as the other entries. — verify: `npm test`, `npm run lint`, `npm run build`; manual check that the HabitSheet tier selector looks unchanged.
- [ ] 3. Habits screen integration — files: `src/ui/Habits.tsx` (when `habits.length > 0`, render `<section className="habits-summary" aria-label={t('habits.summary.aria')}>` with two `StatTile`s: constructive `tone="pos"`, destructive `tone="neg"`; rows Сильные/Средние/Слабые via `tierGroupLabels(t)`, levels 3/2/1; counts from `countByDirectionAndTier(habits, h => ({ direction: h.direction, tier: settingsOn(h, today()).tier }))`; placed after `.habits-head` and before the list; no onClick), `src/ui/HabitSheet.css` (`.habits-summary { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }`, next to `.habits-head`), `src/ui/Habits.test.tsx` (with `[gym, social, steps]`: html contains the aria-label «Сводка по привычкам», «Конструктивные», «Нежелательные», totals 2 and 1 (paused `social` counted), and the strong/medium/weak counts; empty state test asserts `not.toContain('Сводка по привычкам')`) — verify: `npm test`, `npm run lint`, manual check of the Habits tab at phone width (long labels ellipsize, list unchanged).
- [ ] 4. Version bump — files: `package.json` (and `package-lock.json` version fields) to `0.11.0`, mark this plan Status: done — verify: `npm test`, `npm run lint`, `npm run build`; commit message `chore: version 0.11.0`.
