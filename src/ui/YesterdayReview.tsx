import { useEffect, useMemo, useState } from 'react'
import { buildCards, entryForYesNo, type ReviewCard } from '../domain/reviewFlow'
import { deadlineShowsRating, timeLeft } from '../domain/reviewDeadline'
import type { DayKey, DayReview, Habit, HabitEntry } from '../domain/types'
import { weeklyQuotaUsage } from '../engine/quota'
import { useI18n } from '../i18n'
import { Button, FullScreenModal, ProgressSegments, QuotaDots, SwipeCard, type SwipeAnswer } from './components'
import './YesterdayReview.css'

interface Props {
  /** The day being reviewed (`reviewDay(now)`). */
  day: DayKey
  habits: Habit[]
  /** Confirmed reviews (used for weekly quota usage). */
  reviews: DayReview[]
  /** Current rating (replay of confirmed reviews); decides whether the header mentions the rating. */
  rating: number
}

const TICK_MS = 30_000

/** Re-reads the clock every 30 s and when the page becomes visible again. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = window.setInterval(tick, TICK_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return now
}

/**
 * Mandatory yesterday review (renders its own FullScreenModal).
 * State: `answers` (habitId -> entry, survives back/forward), `index` into `cards`,
 * `editing` (habitId fixed from the summary; added in step 12). Stage A = leading 'boolean' cards.
 */
export function YesterdayReview({ day, habits, reviews, rating }: Props) {
  const { t } = useI18n()
  const now = useNow()
  const cards = useMemo(() => buildCards(habits, day), [habits, day])
  const [answers, setAnswers] = useState<Record<string, HabitEntry>>({})
  const [index, setIndex] = useState(0)
  // Step 12 adds `editing` (habitId fixed from the summary) next to these.

  const left = timeLeft(now)
  const deadline =
    t('yr.deadline', { h: left.hours, m: left.minutes }) +
    t('yr.deadlineStreaks') +
    (deadlineShowsRating(rating) ? t('yr.deadlineRating') : '') +
    '.'

  const card = cards[index] as ReviewCard | undefined
  const habit = card && habits.find((h) => h.id === card.habitId)

  const answer = (c: ReviewCard, entry: HabitEntry) => {
    setAnswers((prev) => ({ ...prev, [c.habitId]: entry }))
    setIndex((i) => i + 1)
  }

  const onSwipe = (c: ReviewCard, a: SwipeAnswer) =>
    answer(c, a === 'not_applicable' ? { kind: 'not_applicable' } : entryForYesNo(c, a))

  const quotaFor = (c: ReviewCard) => {
    if (!c.weekly) return null
    const byDay: Record<string, Record<string, HabitEntry>> = {}
    for (const r of reviews) byDay[r.day] = r.entries
    byDay[day] = answers // in-progress answers for yesterday count (reducer habit)
    return weeklyQuotaUsage({ id: c.habitId, quota: c.weekly }, day, byDay)
  }

  const renderYesNo = (c: ReviewCard, name: string) => {
    const kind = c.quota ? 'quota' : c.direction
    const dir = c.direction === 'constructive' ? 'constructive' : 'destructive'
    const usage = quotaFor(c)
    return (
      <SwipeCard
        key={c.habitId}
        typeLabel={t(`yr.type.${kind}`)}
        title={name}
        question={t(`yr.q.${dir}`)}
        goodLabel={t(`yr.good.${kind === 'quota' ? 'quota' : dir}`)}
        badLabel={t(`yr.bad.${kind === 'quota' ? 'quota' : dir}`)}
        hint={t('yr.swipeHint')}
        notApplicableLabel={t('yr.notApplicable')}
        peek={index < cards.length - 1}
        onAnswer={(a) => onSwipe(c, a)}
      >
        {usage && (
          <QuotaDots
            used={usage.used}
            limit={usage.limit}
            note={usage.used >= usage.limit ? t('yr.quota.exhausted') : t('yr.quota.used', { n: usage.used, limit: usage.limit })}
          />
        )}
      </SwipeCard>
    )
  }

  return (
    <FullScreenModal label={t('yr.title')}>
      <div className="yr">
        <header className="yr-head">
          <h1 className="yr-title">{t('yr.title')}</h1>
          <p className="yr-deadline">{deadline}</p>
          <ProgressSegments total={cards.length} current={index} counterLabel={t('yr.counter', { n: Math.min(index + 1, cards.length), total: cards.length })} />
          <div className="yr-back">
            <Button variant="quiet" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))}>
              {t('yr.back')}
            </Button>
          </div>
        </header>
        <div className="yr-body">
          {card && habit && card.stage === 'boolean' && renderYesNo(card, habit.name)}
          {/* Step 12: numeric/time stage, summary, done. */}
        </div>
      </div>
    </FullScreenModal>
  )
}
