import { HistoryEntry } from 'life-elo'

const habitNames = new Map([
  ['h1', 'Пробежка 5 км'],
  ['h2', 'Без сладкого'],
  ['h3', 'Сон до 23:30'],
])

const goodDay = {
  day: '2026-10-30', rulesetVersion: 'v0', reviewRevision: 1,
  ratingBefore: 36, delta: 6, ratingAfter: 42, capped: false,
  contributions: [
    { source: { kind: 'habit' as const, habitId: 'h1' }, outcome: 'done' as const, base: 3, streak: 3, multiplier: 1.2, points: 4 },
    { source: { kind: 'habit' as const, habitId: 'h2' }, outcome: 'complied' as const, base: 1, streak: 1, multiplier: 1, points: 1 },
    { source: { kind: 'clean_day' as const }, base: 1, streak: 5, multiplier: 1, points: 1 },
  ],
}

const badDay = {
  day: '2026-10-29', rulesetVersion: 'v0', reviewRevision: 1,
  ratingBefore: 39, delta: -3, ratingAfter: 36, capped: false,
  contributions: [
    { source: { kind: 'habit' as const, habitId: 'h2' }, outcome: 'violated' as const, base: -2, streak: -1, multiplier: 1, points: -2 },
    { source: { kind: 'habit' as const, habitId: 'h3' }, outcome: 'violated' as const, base: -1, streak: -1, multiplier: 1, points: -1 },
  ],
}

const neutralDay = {
  day: '2026-10-28', rulesetVersion: 'v0', reviewRevision: 1,
  ratingBefore: 39, delta: 0, ratingAfter: 39, capped: false, contributions: [],
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
    <HistoryEntry entry={neutralDay} habitNames={habitNames} />
  </div>
)
