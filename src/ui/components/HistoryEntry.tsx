import type { LedgerEntry } from '../../engine/rating'
import { formatDay, formatSigned, OUTCOME_LABEL } from '../labels'
import './Card.css'
import './HistoryEntry.css'

interface Props {
  entry: LedgerEntry
  habitNames: Map<string, string>
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
              {c.source.kind === 'clean_day'
                ? 'Чистый день'
                : `${habitNames.get(c.source.habitId) ?? '—'} · ${OUTCOME_LABEL[c.outcome!]}`}
              {c.multiplier > 1 && (
                <span className="muted"> · стрик {Math.abs(c.streak)} ×{c.multiplier.toFixed(1)}</span>
              )}
            </span>
            <span>{formatSigned(c.points)}</span>
          </li>
        ))}
        {entry.capped && <li className="muted">Изменение за день ограничено лимитом</li>}
      </ul>
    </details>
  )
}
