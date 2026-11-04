# 02 — Group habits by direction and tier

Status: approved
Design input: none (layout chosen by the user on 2026-11-04, see below)

## Why
Long flat lists of habits (8+) are hard to scan. The user asked to split habits into good / bad and by
severity (tier) on the habits page, in the morning review and in the history day breakdown. Pure
presentation: no scoring change (`LIFE_ELO_PRODUCT_CONTEXT.md` §5, §6.5 tiers weak / medium / strong).

Chosen layout (sections + tier subsections, empty groups hidden):
```
ПОЛЕЗНЫЕ
  Сильные
    …
  Средние
    Ходить 10к шагов · Отлично   +6.32
ВРЕДНЫЕ
  Сильные
    Смотрение YouTube · В рамках +4.74
  Слабые
    Алкоголь · В рамках          +1.58
БОНУСЫ
  Чистый день                    +20
  Курение · бонус за серию       +0.6
```

## Acceptance criteria
- WHEN a list of habits is shown on Habits, Review or an expanded HistoryEntry THE app SHALL group it
  «Полезные» (constructive) first, then «Вредные» (destructive); inside each, «Сильные», «Средние»,
  «Слабые» in that order; groups with no habits are not rendered.
- WHEN habits share a group THE app SHALL keep their existing relative order (stable).
- WHEN a HistoryEntry is expanded THE app SHALL show habit lines in those groups and all non-habit lines
  (clean day, streak bonuses, unknown day) under «Бонусы» (unknown day: no heading needed if it is the
  only line); the S line and the «Обычный день» line stay on top.
- WHEN a habit's tier changed over time THE history SHALL group it by the tier in effect on that day
  (`settingsOn(habit, day)`), and the Habits page / Review by the tier in effect today / on the reviewed day.
- Rating, ledger and stored data SHALL NOT change.

## Open questions
(none)

## Steps
- [x] 1. Pure grouping helper: `groupByDirectionAndTier<T>(items, meta: (t) => {direction, tier})` returning
  `[{direction, tiers: [{tier, items}]}]` in the order above, empty groups dropped, stable; plus Russian
  labels `DIRECTION_GROUP_LABEL` (Полезные / Вредные) and `TIER_GROUP_LABEL` (Сильные / Средние / Слабые)
  — files: `src/ui/grouping.ts`, `src/ui/grouping.test.ts`, `src/ui/labels.ts` — verify: `npm test`
  (order, empty groups dropped, stability).
- [x] 2. Habits page and Review use the helper: section heading (existing `h2` style) per direction,
  muted small subheading per tier; use existing classes (`stack`, `stack-sm`, `muted`) — no new global
  CSS unless unavoidable (then mark design-sync) — files: `src/ui/Habits.tsx`, `src/ui/Review.tsx` —
  verify: `npm run build`, `npm run lint`; manual in `npm run dev`: both screens show the groups.
- [ ] 3. [design-sync] HistoryEntry groups its lines: replace prop `habitNames: Map<string, string>` with
  `habits: Map<string, { name: string; direction: 'constructive' | 'destructive'; tier: 'weak' | 'medium' | 'strong' }>`
  (caller builds it per entry day via `settingsOn`); habit lines grouped per the helper, everything else
  under «Бонусы»; update `Home.tsx`, `.design-sync/config.json` `dtsPropsFor.HistoryEntry` (exactly the new
  props), `.design-sync/previews/HistoryEntry.tsx` (habits map with mixed directions/tiers; keep export
  names) — files: `src/ui/components/HistoryEntry.tsx`, `src/ui/components/HistoryEntry.css` (if needed),
  `src/ui/Home.tsx`, `.design-sync/config.json`, `.design-sync/previews/HistoryEntry.tsx` — verify:
  `npm run build`, `npm run lint`, `npm test`; drift: config props equal real props. User runs `/design-sync`.
