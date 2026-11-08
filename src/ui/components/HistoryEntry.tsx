import type { LedgerEntry } from '../../engine/rating'
import { groupByDirectionAndTier } from '../grouping'
import { useI18n, type I18n } from '../../i18n'
import { directionGroupLabels, formatDay, formatSigned, TIER_COLOR, tierGroupLabels, zoneLabels } from '../labels'
import './Card.css'
import './HistoryEntry.css'

interface Props {
  entry: LedgerEntry
  /** habitId -> name and the direction/tier in effect on the entry's day, used to group habit lines. */
  habits: Map<string, { name: string; direction: 'constructive' | 'destructive'; tier: 'weak' | 'medium' | 'strong' }>
  /** Starts expanded (still collapsible). Remount with a new key to re-apply. */
  defaultOpen?: boolean
}

type Contribution = LedgerEntry['contributions'][number]

function entryLabel(
  t: I18n['t'],
  c: Contribution,
  names: Map<string, string>,
  zoneLabel: (zone: NonNullable<Contribution['zone']>) => string) {
  const { source } = c
  if (source.kind === 'clean_day') return t('history.cleanDay')
  if (source.kind === 'unknown_day') return t('history.unknownDay')
  const name = names.get(source.habitId) ?? '—'
  if (source.kind === 'streak_bonus') return t('history.streakBonus', { name })
  return c.zone ? `${name} · ${zoneLabel(c.zone)}` : name
}

/** One reviewed day: total delta, expandable into score, usual-day comparison and grouped lines. */
export function HistoryEntry({ entry, habits, defaultOpen }: Props) {
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
          {entryLabel(t, c, names, zoneLabel)}
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
    <details className="card history-entry" open={defaultOpen}>
      <summary className="row">
        <span>{formatDay(entry.day, locale)}</span>
        <span className={entry.delta >= 0 ? 'pos' : 'neg'}>{formatSigned(entry.delta)}</span>
      </summary>
      <ul className="explain">
        <li className="row"><span>{t('history.dayScore')}</span><span>{formatSigned(entry.dayScore)}</span></li>
        <li className="muted">
          {t('history.usual', { expected: formatSigned(entry.expected), today: formatSigned(entry.dayScore) })}
        </li>
        {groups.map((g) => [
          <li key={g.direction}><strong>{DIRECTION_GROUP_LABEL[g.direction]}</strong></li>,
          ...g.tiers.flatMap((tg) => [
            <li key={`${g.direction}-${tg.tier}`} className="muted">
              <span style={{ color: TIER_COLOR[tg.tier] }}>●</span> {TIER_GROUP_LABEL[tg.tier]}
            </li>,
            ...tg.items.map(({ c, i }) => line(c, i)),
          ]),
        ])}
        {otherLines.length > 0 && !onlyUnknownDay && <li><strong>{t('history.bonuses')}</strong></li>}
        {otherLines.map(({ c, i }) => line(c, i))}
        {entry.clamped && <li className="muted">{t('history.clamped')}</li>}
      </ul>
    </details>
  )
}
