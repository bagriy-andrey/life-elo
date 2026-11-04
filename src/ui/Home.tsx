import type { Habit } from '../domain/types'
import type { ReplayResult } from '../engine/rating'
import { Banner, EloScore, HistoryEntry } from './components'
import { settingsOn } from '../domain/settings'
import { useI18n } from '../i18n'
import { formatDay, formatSigned } from './labels'

interface Props {
  result: ReplayResult
  habits: Habit[]
  pendingDay?: string
  onReview: () => void
}

export function Home({ result, habits, pendingDay, onReview }: Props) {
  const { locale } = useI18n()
  const habitsOn = (day: string) =>
    new Map(
      habits.map((h) => {
        const { tier } = settingsOn(h, day)
        return [h.id, { name: h.name, direction: h.direction, tier }] as const
      }),
    )
  const last = result.ledger.at(-1)

  return (
    <section className="stack">
      <EloScore
        rating={result.rating}
        streak={result.cleanDayStreak}
        caption={
          last
            ? `${formatSigned(last.delta, 1)} за ${formatDay(last.day, locale)}`
            : 'Старт с нуля — подтвердите первый день'
        }
      />

      {pendingDay && (
        <Banner
          title="Как прошёл вчерашний день?"
          subtitle={`${formatDay(pendingDay, locale)} ждёт подтверждения →`}
          onClick={onReview}
        />
      )}

      {result.ledger.length > 0 && (
        <div className="stack">
          <h2>История</h2>
          {[...result.ledger].reverse().map((entry) => (
            <HistoryEntry key={entry.day} entry={entry} habits={habitsOn(entry.day)} />
          ))}
        </div>
      )}
    </section>
  )
}
