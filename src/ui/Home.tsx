import type { Habit } from '../domain/types'
import type { ReplayResult } from '../engine/rating'
import { formatDay, formatSigned, OUTCOME_LABEL } from './labels'

interface Props {
  result: ReplayResult
  habits: Habit[]
  pendingDay?: string
  onReview: () => void
}

export function Home({ result, habits, pendingDay, onReview }: Props) {
  const names = new Map(habits.map((h) => [h.id, h.name]))
  const last = result.ledger.at(-1)
  const sign = result.rating > 0 ? 'pos' : result.rating < 0 ? 'neg' : 'zero'

  return (
    <section className="stack">
      <div className="elo card">
        <span className="muted">Life Elo</span>
        <strong className={`elo-value ${sign}`}>{formatSigned(result.rating)}</strong>
        {last ? (
          <span className="muted">
            {formatSigned(last.delta)} за {formatDay(last.day)}
          </span>
        ) : (
          <span className="muted">Старт с нуля — подтвердите первый день</span>
        )}
        {result.cleanDayStreak > 0 && (
          <span className="pill">Чистых дней подряд: {result.cleanDayStreak}</span>
        )}
      </div>

      {pendingDay && (
        <button className="card banner" onClick={onReview}>
          <strong>Как прошёл вчерашний день?</strong>
          <span className="muted">{formatDay(pendingDay)} ждёт подтверждения →</span>
        </button>
      )}

      {result.ledger.length > 0 && (
        <div className="stack">
          <h2>История</h2>
          {[...result.ledger].reverse().map((entry) => (
            <details key={entry.day} className="card">
              <summary className="row">
                <span>{formatDay(entry.day)}</span>
                <span className={entry.delta >= 0 ? 'pos' : 'neg'}>
                  {formatSigned(entry.delta)}
                </span>
              </summary>
              <ul className="explain">
                {entry.contributions.length === 0 && <li className="muted">Без изменений</li>}
                {entry.contributions.map((c, i) => (
                  <li key={i} className="row">
                    <span>
                      {c.source.kind === 'clean_day'
                        ? 'Чистый день'
                        : `${names.get(c.source.habitId) ?? '—'} · ${OUTCOME_LABEL[c.outcome!]}`}
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
          ))}
        </div>
      )}
    </section>
  )
}
