import type { LedgerEntry } from '../../engine/rating'
import { groupByDirectionAndTier } from '../grouping'
import { useI18n } from '../../i18n'
import { directionGroupLabels, formatDay, formatSigned, TIER_COLOR, tierGroupLabels, zoneLabels } from '../labels'
import './Card.css'
import './HistoryEntry.css'

interface Props {
  entry: LedgerEntry
  /** habitId -> name and the direction/tier in effect on the entry's day, used to group habit lines. */
  habits: Map<string, { name: string; direction: 'constructive' | 'destructive'; tier: 'weak' | 'medium' | 'strong' }>
}

type Contribution = LedgerEntry['contributions'][number]

function entryLabel(c: Contribution, names: Map<string, string>, zoneLabel: (zone: NonNullable<Contribution['zone']>) => string) {
  const { source } = c
  if (source.kind === 'clean_day') return 'Чистый день'
  if (source.kind === 'unknown_day') return 'День без отметки'
  const name = names.get(source.habitId) ?? '—'
  if (source.kind === 'streak_bonus') return `${name} · бонус за серию`
  return c.zone ? `${name} · ${zoneLabel(c.zone)}` : name
}

/** One reviewed day: total delta, expandable into score, usual-day comparison and grouped lines. */
export function HistoryEntry({ entry, habits }: Props) {
  const { t, locale } = useI18n()
  const ZONE_LABEL = zoneLabels(t)
  const DIRECTION_GROUP_LABEL = directionGroupLabels(t)
  const TIER_GROUP_LABEL = tierGroupLabels(t)
  const zoneLabel = (zone: NonNullable<Contribution['zone']>) =>
    zone === 'unknown' ? t('history.unknown') : zone === 'not_applicable' ? t('answer.na') : ZONE_LABEL[zone]
  const names = new Map([...habits].map(([id, h]) => [id, h.name]))
  const tierOf = (c: Contribution) =>
    c.source.kind === 'habit' || c.source.kind === 'streak_bonus' ? habits.get(c.source.habitId)?.tier : undefined
  const line = (c: Contribution, i: number) => {
    const tier = tierOf(c)
    return (
      <li key={i} className="row">
        <span>
          {tier && <span style={{ color: TIER_COLOR[tier] }}>● </span>}
          {entryLabel(c, names, zoneLabel)}
          {c.multiplier > 1 && <span className="muted"> · ×{c.multiplier.toFixed(2)}</span>}
        </span>
        <span>{formatSigned(c.points)}</span>
      </li>
    )
  }
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
        <span>{formatDay(entry.day, locale)}</span>
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
            <li key={`${g.direction}-${t.tier}`} className="muted">
              <span style={{ color: TIER_COLOR[t.tier] }}>●</span> {TIER_GROUP_LABEL[t.tier]}
            </li>,
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
