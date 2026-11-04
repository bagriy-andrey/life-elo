import type { LedgerEntry } from '../../engine/rating'
import { groupByDirectionAndTier } from '../grouping'
import { DIRECTION_GROUP_LABEL, formatDay, formatSigned, TIER_GROUP_LABEL, ZONE_LABEL } from '../labels'
import './Card.css'
import './HistoryEntry.css'

interface Props {
  entry: LedgerEntry
  /** habitId -> name and the direction/tier in effect on the entry's day, used to group habit lines. */
  habits: Map<string, { name: string; direction: 'constructive' | 'destructive'; tier: 'weak' | 'medium' | 'strong' }>
}

type Contribution = LedgerEntry['contributions'][number]

const EXTRA_ZONE_LABEL = { unknown: 'Не помню', not_applicable: 'Не актуально' } as const

function zoneLabel(zone: NonNullable<Contribution['zone']>) {
  return zone in ZONE_LABEL ? ZONE_LABEL[zone as keyof typeof ZONE_LABEL] : EXTRA_ZONE_LABEL[zone as keyof typeof EXTRA_ZONE_LABEL]
}

function entryLabel(c: Contribution, names: Map<string, string>) {
  const { source } = c
  if (source.kind === 'clean_day') return 'Чистый день'
  if (source.kind === 'unknown_day') return 'День без отметки'
  const name = names.get(source.habitId) ?? '—'
  if (source.kind === 'streak_bonus') return `${name} · бонус за серию`
  return c.zone ? `${name} · ${zoneLabel(c.zone)}` : name
}

/** One reviewed day: total delta, expandable into score, usual-day comparison and grouped lines. */
export function HistoryEntry({ entry, habits }: Props) {
  const names = new Map([...habits].map(([id, h]) => [id, h.name]))
  const line = (c: Contribution, i: number) => (
    <li key={i} className="row">
      <span>
        {entryLabel(c, names)}
        {c.multiplier > 1 && <span className="muted"> · ×{c.multiplier.toFixed(2)}</span>}
      </span>
      <span>{formatSigned(c.points)}</span>
    </li>
  )
  const indexed = entry.contributions.map((c, i) => ({ c, i }))
  const habitLines = indexed.filter(({ c }) => c.source.kind === 'habit')
  const otherLines = indexed.filter(({ c }) => c.source.kind !== 'habit')
  const groups = groupByDirectionAndTier(habitLines, ({ c }) => {
    const h = c.source.kind === 'habit' ? habits.get(c.source.habitId) : undefined
    return { direction: h?.direction ?? 'constructive', tier: h?.tier ?? 'medium' }
  })
  const onlyUnknownDay = otherLines.length === 1 && otherLines[0].c.source.kind === 'unknown_day'

  return (
    <details className="card history-entry">
      <summary className="row">
        <span>{formatDay(entry.day)}</span>
        <span className={entry.delta >= 0 ? 'pos' : 'neg'}>{formatSigned(entry.delta)}</span>
      </summary>
      <ul className="explain">
        <li className="row"><span>Оценка дня S</span><span>{formatSigned(entry.dayScore)}</span></li>
        <li className="muted">
          Обычный день: {formatSigned(entry.expected)}, сегодня: {formatSigned(entry.dayScore)}
        </li>
        {groups.map((g) => [
          <li key={g.direction}><strong>{DIRECTION_GROUP_LABEL[g.direction]}</strong></li>,
          ...g.tiers.flatMap((t) => [
            <li key={`${g.direction}-${t.tier}`} className="muted">{TIER_GROUP_LABEL[t.tier]}</li>,
            ...t.items.map(({ c, i }) => line(c, i)),
          ]),
        ])}
        {otherLines.length > 0 && !onlyUnknownDay && <li><strong>Бонусы</strong></li>}
        {otherLines.map(({ c, i }) => line(c, i))}
        {entry.clamped && <li className="muted">День ограничен пределом ±100</li>}
      </ul>
    </details>
  )
}
