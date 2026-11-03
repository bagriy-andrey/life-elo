import type { LedgerEntry } from '../../engine/rating'
import { formatDay, formatSigned, ZONE_LABEL } from '../labels'
import './Card.css'
import './HistoryEntry.css'

interface Props {
  entry: LedgerEntry
  habitNames: Map<string, string>
}

function entryLabel(c: LedgerEntry['contributions'][number], names: Map<string, string>) {
  const { source } = c
  if (source.kind === 'clean_day') return 'Чистый день'
  if (source.kind === 'unknown_day') return 'День без отметки'
  const name = names.get(source.habitId) ?? '—'
  if (source.kind === 'streak_bonus') return `${name} · бонус за серию`
  return c.zone && c.zone in ZONE_LABEL ? `${name} · ${ZONE_LABEL[c.zone as keyof typeof ZONE_LABEL]}` : name
}

/** One reviewed day: total delta, expandable into per-habit contributions. */
export function HistoryEntry({ entry, habitNames }: Props) {
  return (
    <details className="card history-entry">
      <summary className="row">
        <span>{formatDay(entry.day)}</span>
        <span className={entry.delta >= 0 ? 'pos' : 'neg'}>{formatSigned(entry.delta)}</span>
      </summary>
      <ul className="explain">
        {entry.contributions.length === 0 && <li className="muted">Без изменений</li>}
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
