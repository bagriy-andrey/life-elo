import { HistoryEntry } from 'life-elo'

const habitNames = new Map([
  ['h1', 'Пробежка 5 км'],
  ['h2', 'Без сладкого'],
  ['h3', 'Сон до 23:30'],
])

const goodDay = {
  day: '2026-10-30', rulesetVersion: 'v1', reviewRevision: 1, status: 'reviewed' as const,
  ratingBefore: 36, delta: 4.2, ratingAfter: 40.2, dayScore: 7.8, expected: 3.6, clamped: false,
  contributions: [
    { source: { kind: 'habit' as const, habitId: 'h1' }, zone: 'excellent' as const, points: 3, multiplier: 1 },
    { source: { kind: 'habit' as const, habitId: 'h2' }, zone: 'ok' as const, points: 1, multiplier: 1 },
    { source: { kind: 'clean_day' as const }, points: 2, multiplier: 1 },
    { source: { kind: 'streak_bonus' as const, habitId: 'h1' }, points: 1.8, multiplier: 1 },
  ],
}

const badDay = {
  day: '2026-10-29', rulesetVersion: 'v1', reviewRevision: 1, status: 'reviewed' as const,
  ratingBefore: 39, delta: -5.9, ratingAfter: 33.1, dayScore: -2, expected: 3.9, clamped: false,
  contributions: [
    { source: { kind: 'habit' as const, habitId: 'h2' }, zone: 'bad' as const, points: -2, multiplier: 1.25 },
    { source: { kind: 'habit' as const, habitId: 'h3' }, zone: 'tolerable' as const, points: 0, multiplier: 1 },
  ],
}

const unknownDay = {
  day: '2026-10-28', rulesetVersion: 'v1', reviewRevision: 0, status: 'unknown' as const,
  ratingBefore: 39, delta: -3.9, ratingAfter: 35.1, dayScore: 0, expected: 3.9, clamped: false,
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
