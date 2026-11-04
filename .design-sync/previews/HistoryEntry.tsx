import { HistoryEntry } from 'life-elo'

// Realistic RULESET_V1 (v1.1) numbers, three consecutive days (28 → 29 → 30 Oct).
// Habits: run = strong (3), sweets = medium (2, destructive), sleep = weak (1); Σw = 6, unit = 10.
// Streak bonus starts on day 3 (strong) / 5 (medium) / 7 (weak), full on day 7.
// R ← R + 0.1 × (10·S − R); "usual day" = R / 10.
const habitNames = new Map([
  ['h1', 'Пробежка 5 км'],
  ['h2', 'Без сладкого'],
  ['h3', 'Сон до 23:30'],
])

const goodDay = {
  day: '2026-10-30', rulesetVersion: 'v1.1', reviewRevision: 1, status: 'reviewed' as const,
  ratingBefore: 252.4, delta: 48.76, ratingAfter: 301.16, dayScore: 74, expected: 25.24, clamped: false,
  contributions: [
    { source: { kind: 'habit' as const, habitId: 'h1' }, zone: 'excellent' as const, points: 30, multiplier: 1 },
    { source: { kind: 'habit' as const, habitId: 'h2' }, zone: 'ok' as const, points: 10, multiplier: 1 },
    { source: { kind: 'habit' as const, habitId: 'h3' }, zone: 'excellent' as const, points: 10, multiplier: 1 },
    { source: { kind: 'clean_day' as const }, points: 20, multiplier: 1 },
    { source: { kind: 'streak_bonus' as const, habitId: 'h1' }, points: 4, multiplier: 1 },
  ],
}

const badDay = {
  day: '2026-10-29', rulesetVersion: 'v1.1', reviewRevision: 1, status: 'reviewed' as const,
  ratingBefore: 306, delta: -53.6, ratingAfter: 252.4, dayScore: -23, expected: 30.6, clamped: false,
  contributions: [
    { source: { kind: 'habit' as const, habitId: 'h1' }, zone: 'tolerable' as const, points: 0, multiplier: 1 },
    { source: { kind: 'habit' as const, habitId: 'h2' }, zone: 'bad' as const, points: -25, multiplier: 1.25 },
    { source: { kind: 'habit' as const, habitId: 'h3' }, zone: 'tolerable' as const, points: 0, multiplier: 1 },
    { source: { kind: 'streak_bonus' as const, habitId: 'h1' }, points: 2, multiplier: 1 },
  ],
}

const unknownDay = {
  day: '2026-10-28', rulesetVersion: 'v1.1', reviewRevision: 0, status: 'unknown' as const,
  ratingBefore: 340, delta: -34, ratingAfter: 306, dayScore: 0, expected: 34, clamped: false,
  contributions: [{ source: { kind: 'unknown_day' as const }, points: 0, multiplier: 1 }],
}

// <details> starts closed; open it so the contribution breakdown is visible.
const openDetails = (el: HTMLDivElement | null) => el?.querySelector('details')?.setAttribute('open', '')

export const Expanded = () => (
  <div ref={openDetails} style={{ width: 360 }}>
    <HistoryEntry entry={goodDay} habitNames={habitNames} />
  </div>
)

export const Collapsed = () => (
  <div className="stack" style={{ width: 360 }}>
    <HistoryEntry entry={goodDay} habitNames={habitNames} />
    <HistoryEntry entry={badDay} habitNames={habitNames} />
  </div>
)

export const NegativeExpanded = () => (
  <div ref={openDetails} style={{ width: 360 }}>
    <HistoryEntry entry={badDay} habitNames={habitNames} />
  </div>
)

export const NoChange = () => (
  <div ref={openDetails} style={{ width: 360 }}>
    <HistoryEntry entry={unknownDay} habitNames={habitNames} />
  </div>
)
