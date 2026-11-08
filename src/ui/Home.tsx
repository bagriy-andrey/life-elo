import { useState } from 'react'
import type { Habit } from '../domain/types'
import type { ReplayResult } from '../engine/rating'
import { Banner, HistoryEntry, Pill } from './components'
import { cx } from './components/cx'
import { settingsOn } from '../domain/settings'
import { useI18n } from '../i18n'
import { HomeChart } from './HomeChart'
import { rangeStart, type HomeRange } from './homeStats'
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
  const { ledger, rating } = result
  const [range, setRange] = useState<HomeRange>('ten')
  // Selected day is kept by key: null follows the newest day.
  const [selDay, setSelDay] = useState<string | null>(null)
  const found = selDay === null ? -1 : ledger.findIndex((e) => e.day === selDay)
  const selected = found >= 0 ? found : ledger.length - 1
  const entry = ledger[selected]
  const last = ledger.at(-1)

  const onSelect = (i: number) => {
    setSelDay(ledger[i].day)
    if (i < rangeStart(ledger.length, 'ten')) setRange('all')
  }
  const onRangeChange = (r: HomeRange) => {
    setRange(r)
    if (r === 'ten' && selected < rangeStart(ledger.length, 'ten')) setSelDay(null)
  }

  return (
    <section className="stack">
      <header className="home-head">
        <div className="home-head-rating">
          <span className="muted">{t('home.app')}</span>
          <strong className={cx('home-rating', rating > 0 ? 'pos' : rating < 0 ? 'neg' : 'zero')}>
            {formatSigned(rating, 1)}
          </strong>
        </div>
        <div className="home-head-delta">
          {last ? (
            <>
              <Pill tone={last.delta >= 0 ? 'pos' : 'neg'}>{formatSigned(last.delta, 1)}</Pill>
              <span>{t('home.forDay', { day: formatDay(last.day, locale) })}</span>
            </>
          ) : (
            <span>{t('home.startCaption')}</span>
          )}
        </div>
      </header>

      {pendingDay && (
        <Banner
          title={t('home.pendingTitle')}
          subtitle={t('home.pendingSubtitle', { day: formatDay(pendingDay, locale) })}
          onClick={onReview}
        />
      )}

      {entry && (
        <>
          <HomeChart
            ledger={ledger}
            selected={selected}
            onSelect={onSelect}
            range={range}
            onRangeChange={onRangeChange}
          />
          <h2>{t('home.dayReview')}</h2>
          <HistoryEntry key={entry.day} defaultOpen entry={entry} habits={habitsOn(entry.day)} />
        </>
      )}
    </section>
  )
}
