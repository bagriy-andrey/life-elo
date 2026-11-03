import type { LedgerEntry } from '../../engine/rating'
import { formatDay, formatSigned, ZONE_LABEL } from '../labels'
import './Card.css'
import './HistoryEntry.css'

interface Props {
  entry: LedgerEntry
  habitNames: Map<string, string>
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

/** One reviewed day: total delta, expandable into score, usual-day comparison and per-habit lines. */
export function HistoryEntry({ entry, habitNames }: Props) {
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
        {entry.contributions.map((c, i) => (
          <li key={i} className="row">
            <span>
              {entryLabel(c, habitNames)}
              {c.multiplier > 1 && <span className="muted"> · ×{c.multiplier.toFixed(2)}</span>}
            </span>
            <span>{formatSigned(c.points)}</span>
          </li>
        ))}
        {entry.clamped && <li className="muted">День ограничен пределом ±100</li>}
      </ul>
    </details>
  )
}
