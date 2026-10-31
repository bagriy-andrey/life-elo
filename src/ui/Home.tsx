import type { Habit } from '../domain/types'
import type { ReplayResult } from '../engine/rating'
import { Banner, EloScore, HistoryEntry } from './components'
import { formatDay, formatSigned } from './labels'

interface Props {
  result: ReplayResult
  habits: Habit[]
  pendingDay?: string
  onReview: () => void
}

export function Home({ result, habits, pendingDay, onReview }: Props) {
  const names = new Map(habits.map((h) => [h.id, h.name]))
  const last = result.ledger.at(-1)

  return (
    <section className="stack">
      <EloScore
        rating={result.rating}
        streak={result.cleanDayStreak}
        caption={
          last
            ? `${formatSigned(last.delta)} за ${formatDay(last.day)}`
            : 'Старт с нуля — подтвердите первый день'
        }
      />

      {pendingDay && (
        <Banner
          title="Как прошёл вчерашний день?"
          subtitle={`${formatDay(pendingDay)} ждёт подтверждения →`}
          onClick={onReview}
        />
      )}

      {result.ledger.length > 0 && (
        <div className="stack">
          <h2>История</h2>
          {[...result.ledger].reverse().map((entry) => (
            <HistoryEntry key={entry.day} entry={entry} habitNames={names} />
          ))}
        </div>
      )}
    </section>
  )
}
