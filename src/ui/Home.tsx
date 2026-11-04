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
  const { t, locale } = useI18n()
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
            ? t('home.lastDelta', { delta: formatSigned(last.delta, 1), day: formatDay(last.day, locale) })
            : t('home.startCaption')
        }
      />

      {pendingDay && (
        <Banner
          title={t('home.pendingTitle')}
          subtitle={t('home.pendingSubtitle', { day: formatDay(pendingDay, locale) })}
          onClick={onReview}
        />
      )}

      {result.ledger.length > 0 && (
        <div className="stack">
          <h2>{t('home.history')}</h2>
          {[...result.ledger].reverse().map((entry) => (
            <HistoryEntry key={entry.day} entry={entry} habits={habitsOn(entry.day)} />
          ))}
        </div>
      )}
    </section>
  )
}
