import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AuthContext } from '../auth/context'
import { pull as pullGarmin } from '../garmin/api'
import { mergeGarminPrefill, prefillFromGarmin } from '../domain/garminPrefill'
import { confirmDay, db } from '../db/db'
import { buildReview, DayLockedError } from '../db/confirm'
import { addDays } from '../domain/day'
import {
  buildCards,
  entryForYesNo,
  goalLabelParts,
  weeklyGoalNote,
  type NumericUnit,
  type ReviewCard,
} from '../domain/reviewFlow'
import { deadlineShowsRating, timeLeft } from '../domain/reviewDeadline'
import { reviewOutcome, type ReviewOutcome } from '../domain/reviewOutcome'
import { settingsOn } from '../domain/settings'
import type { DayKey, DayReview, GarminDay, Habit, HabitEntry } from '../domain/types'
import { RULESET_V2 } from '../engine/config'
import { quotaZone, weeklyQuotaUsage } from '../engine/quota'
import { replay } from '../engine/rating'
import { classifyZone } from '../engine/zones'
import { useI18n } from '../i18n'
import { Button, FullScreenModal, Notice, ProgressSegments, QuotaDots, SwipeCard, type SwipeAnswer } from './components'
import { YesterdayDone } from './YesterdayDone'
import { YesterdayNumeric } from './YesterdayNumeric'
import './YesterdayReview.css'

interface Props {
  /** The day being reviewed (`reviewDay(now)`). */
  day: DayKey
  habits: Habit[]
  /** Confirmed reviews (used for weekly quota usage). */
  reviews: DayReview[]
  /** Current rating (replay of confirmed reviews); decides whether the header mentions the rating. */
  rating: number
  /** Closes the modal: "Продолжить" on the done screen, or "Закрыть" when the day got locked. */
  onClose: () => void
  /** True while this modal's own save is in flight/done; false if it failed. Lets the parent tell our review from a remote one. */
  onSaving?: (active: boolean) => void
  /** Preview/test seam: start from given answers/screen (e.g. the summary). */
  initialState?: { answers?: Record<string, HabitEntry>; screen?: Screen; index?: number; fromGarmin?: string[] }
}

type Screen = 'cards' | 'summary' | 'done'
type Tone = 'pos' | 'neg' | 'plain'

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
 * State: `answers` (habitId -> entry, survives back/forward), `index` into `cards` (stage A = leading
 * 'boolean' cards), `screen` ('cards' | 'summary' | 'done') and `editing` (habitId fixed from the
 * summary: answering returns to the summary). The parent must keep it mounted until `onClose`
 * (saving makes the review appear in `reviews`, which must not unmount the done screen).
 */
export function YesterdayReview({ day, habits, reviews, rating, onClose, onSaving, initialState }: Props) {
  const { t, locale } = useI18n()
  const now = useNow()
  const cards = useMemo(() => buildCards(habits, day), [habits, day])
  const [answers, setAnswers] = useState<Record<string, HabitEntry>>(initialState?.answers ?? {})
  const [index, setIndex] = useState(initialState?.index ?? 0)
  const [screen, setScreen] = useState<Screen>(initialState?.screen ?? 'cards')
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<'closed' | 'save' | null>(null)
  const [outcome, setOutcome] = useState<ReviewOutcome | null>(null)
  // Habits whose current answer came from Garmin; `touched` = answered by the user (never overwritten).
  const [fromGarmin, setFromGarmin] = useState<Set<string>>(() => new Set(initialState?.fromGarmin))
  const touched = useRef<Set<string>>(
    new Set(Object.keys(initialState?.answers ?? {}).filter((id) => !initialState?.fromGarmin?.includes(id))),
  )
  const signedIn = !!useContext(AuthContext)?.session
  const confirmedDay = reviews.some((r) => r.day === day)
  const prefillOn = signedIn && !confirmedDay && screen !== 'done'

  useEffect(() => {
    if (signedIn && !confirmedDay) void pullGarmin(day, addDays(day, 1))
    // Once per opened day; the api never throws and handles not_connected/offline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day, signedIn])

  const garminRows = useLiveQuery(
    async () => (await db.garmin.bulkGet([day, addDays(day, 1)])).filter((r) => r !== undefined),
    [day],
  )
  useEffect(() => {
    if (!prefillOn || !garminRows?.length) return
    const byDay: Record<string, GarminDay> = {}
    for (const r of garminRows) byDay[r.day] = r
    const prefill = prefillFromGarmin(habits, day, byDay)
    setAnswers((prev) => {
      const m = mergeGarminPrefill(prefill, cards.map((c) => c.habitId), prev, touched.current)
      if (m.applied.length) setFromGarmin((f) => new Set([...f, ...m.applied]))
      return m.applied.length ? m.answers : prev
    })
  }, [garminRows, habits, day, cards, prefillOn])

  const left = timeLeft(now)
  const deadline =
    t('yr.deadline', { h: left.hours, m: left.minutes }) +
    t('yr.deadlineStreaks') +
    (deadlineShowsRating(rating) ? t('yr.deadlineRating') : '') +
    '.'

  const card = (editing ? cards.find((c) => c.habitId === editing) : cards[index]) as ReviewCard | undefined
  const habit = card && habits.find((h) => h.id === card.habitId)

  const answer = (c: ReviewCard, entry: HabitEntry) => {
    touched.current.add(c.habitId)
    setFromGarmin((f) => {
      if (!f.has(c.habitId)) return f
      const n = new Set(f)
      n.delete(c.habitId)
      return n
    })
    setAnswers((prev) => ({ ...prev, [c.habitId]: entry }))
    if (editing) {
      setEditing(null)
      setScreen('summary')
    } else if (index + 1 >= cards.length) {
      setScreen('summary')
    } else {
      setIndex((i) => i + 1)
    }
  }

  const back = () => {
    if (editing) {
      setEditing(null)
      setScreen('summary')
    } else if (screen === 'summary') {
      setIndex(cards.length - 1)
      setScreen('cards')
    } else {
      setIndex((i) => Math.max(0, i - 1))
    }
  }

  const onSwipe = (c: ReviewCard, a: SwipeAnswer) =>
    answer(c, a === 'not_applicable' ? { kind: 'not_applicable' } : entryForYesNo(c, a))

  const byDayWith = (entries: Record<string, HabitEntry>) => {
    const byDay: Record<string, Record<string, HabitEntry>> = {}
    for (const r of reviews) byDay[r.day] = r.entries
    byDay[day] = entries // in-progress answers for yesterday count (reducer habit)
    return byDay
  }

  const quotaFor = (c: ReviewCard) => {
    if (!c.weekly) return null
    return weeklyQuotaUsage({ id: c.habitId, quota: c.weekly }, day, byDayWith(answers))
  }

  const renderYesNo = (c: ReviewCard, name: string) => {
    const kind = c.quota ? 'quota' : c.direction
    const dir = c.direction === 'constructive' ? 'constructive' : 'destructive'
    const usage = quotaFor(c)
    const h = habits.find((x) => x.id === c.habitId)
    const goal = h ? weeklyGoalNote(h, day, byDayWith(answers)) : null
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
        peek={!editing && index < cards.length - 1}
        onAnswer={(a) => onSwipe(c, a)}
      >
        {usage && (
          <QuotaDots
            used={usage.used}
            limit={usage.limit}
            note={usage.used >= usage.limit ? t('yr.quota.exhausted') : t('yr.quota.used', { n: usage.used, limit: usage.limit })}
          />
        )}
        {fromGarmin.has(c.habitId) && answers[c.habitId] && (
          <p className="yr-garmin-hint">
            {t('garmin.fromGarmin')}: {t(`yr.good.${kind === 'quota' ? 'quota' : dir}`)}
          </p>
        )}
        {goal && <p className="yr-week-note">{t('review.weekProgress', { done: goal.done, target: goal.target })}</p>}
      </SwipeCard>
    )
  }

  const fmtNum = (n: number) => n.toLocaleString(locale)

  const goalText = (h: Habit): string | undefined => {
    const parts = goalLabelParts(settingsOn(h, day).rule)
    if (!parts) return undefined
    if (parts.unit === 'time') {
      return t(parts.better === 'lower' ? 'yr.goalTimeLower' : 'yr.goalTimeHigher', { value: String(parts.value) })
    }
    const value = Number(parts.value)
    return t(parts.better === 'lower' ? 'yr.goalLower' : 'yr.goal', {
      value: fmtNum(value),
      unit: t(`unit.${parts.unit}`, { count: value }),
    })
  }

  const renderNumeric = (c: ReviewCard, h: Habit) => {
    const s = settingsOn(h, day)
    const unit: NumericUnit | 'time' = c.stage === 'time' ? 'time' : c.quota ? 'count' : s.rule.kind === 'measured' && s.rule.unit !== 'time' ? s.rule.unit : 'count'
    const prev = answers[c.habitId]
    const initial = prev?.kind === 'value' && typeof prev.value !== 'boolean' ? prev.value : undefined
    return (
      <YesterdayNumeric
        key={c.habitId}
        unit={unit}
        title={h.name}
        typeLabel={t(unit === 'time' ? 'yr.type.time' : 'yr.type.numeric')}
        question={t(unit === 'time' ? 'yr.q.time' : c.quota || unit === 'count' ? 'yr.howMany' : 'yr.num.label')}
        goal={c.quota ? undefined : goalText(h)}
        initial={initial}
        hint={fromGarmin.has(c.habitId) && initial !== undefined ? t('garmin.fromGarmin') : undefined}
        onConfirm={(value) => answer(c, { kind: 'value', value })}
        onNotApplicable={() => answer(c, { kind: 'not_applicable' })}
      />
    )
  }

  /** Summary row text and tone (see plan 07 step 12 for the colour rules). */
  const rowOf = (c: ReviewCard, h: Habit): { value: string; tone: Tone } => {
    const entry = answers[c.habitId]
    if (!entry || entry.kind !== 'value') return { value: t('yr.notApplicable'), tone: 'plain' }
    const dir = c.direction === 'constructive' ? 'constructive' : 'destructive'
    if (c.stage === 'boolean') {
      const good = entry.value === true || entry.value === 0
      if (c.quota) return { value: t(good ? 'yr.good.quota' : 'yr.bad.quota'), tone: good ? 'pos' : 'plain' }
      return { value: t(`yr.${good ? 'good' : 'bad'}.${dir}`), tone: good ? 'pos' : dir === 'destructive' ? 'neg' : 'plain' }
    }
    const s = settingsOn(h, day)
    const zone = c.quota
      ? quotaZone({ id: c.habitId, quota: c.quota }, day, byDayWith(answers))
      : classifyZone({ direction: h.direction, rule: s.rule }, entry)
    const tone: Tone = zone === 'excellent' || zone === 'ok' ? 'pos' : 'plain'
    if (typeof entry.value === 'string') return { value: entry.value, tone }
    const unit = c.quota ? 'count' : s.rule.kind === 'measured' ? s.rule.unit : 'count'
    return { value: `${fmtNum(Number(entry.value))} ${t(`unit.${unit}`, { count: Number(entry.value) })}`, tone }
  }

  const save = async () => {
    if (saving || cards.some((c) => !answers[c.habitId])) return
    setSaving(true)
    setError(null)
    const full = Object.fromEntries(cards.map((c) => [c.habitId, answers[c.habitId]]))
    const at = new Date()
    try {
      onSaving?.(true)
      await confirmDay(day, full, at)
    } catch (e) {
      onSaving?.(false)
      setError(e instanceof DayLockedError ? 'closed' : 'save')
      setSaving(false)
      return
    }
    try {
      // Same `asOf` as App's replay, so the done screen matches the home rating.
      const existing = reviews.find((r) => r.day === day)
      const saved = buildReview(day, full, at, existing)
      const asOf = addDays(day, 1)
      const before = replay(habits, reviews, RULESET_V2, asOf)
      const after = replay(habits, [...reviews.filter((r) => r.day !== day), saved], RULESET_V2, asOf)
      setOutcome(reviewOutcome(before, after, day))
      setScreen('done')
    } catch {
      // The day is saved; without an outcome there is nothing to show, so just close.
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const showCards = screen === 'cards' || editing !== null
  const counter = editing
    ? t('yr.counterEdit')
    : t('yr.counter', { n: Math.min(index + 1, cards.length), total: cards.length })

  return (
    <FullScreenModal label={t('yr.title')}>
      <div className="yr">
        <header className="yr-head">
          <h2 className="yr-title">{screen === 'summary' && !editing ? t('yr.summary.title') : t('yr.title')}</h2>
          <p className="yr-deadline">{deadline}</p>
          {showCards && screen !== 'done' &&
            (editing ? (
              <p className="progress-counter">{counter}</p>
            ) : (
              <ProgressSegments total={cards.length} current={index} counterLabel={counter} />
            ))}
          {screen !== 'done' && error !== 'closed' && (
            <div className="yr-back">
              <Button variant="quiet" disabled={saving || (!editing && screen === 'cards' && index === 0)} onClick={back}>
                {t('yr.back')}
              </Button>
            </div>
          )}
        </header>
        <div className="yr-body">
          {showCards && card && habit && (card.stage === 'boolean' ? renderYesNo(card, habit.name) : renderNumeric(card, habit))}
          {screen === 'summary' && !editing && (
            <div className="yr-summary">
              <p className="yr-summary-hint">{t('yr.summary.hint')}</p>
              <div className="yr-rows">
                {cards.map((c) => {
                  const h = habits.find((x) => x.id === c.habitId)
                  if (!h) return null
                  const row = rowOf(c, h)
                  return (
                    <button
                      key={c.habitId}
                      type="button"
                      className="yr-row"
                      aria-label={`${h.name}: ${row.value}. ${t('yr.summary.edit')}`}
                      disabled={saving || error === 'closed'}
                      onClick={() => setEditing(c.habitId)}
                    >
                      <strong className="yr-row-name">{h.name}</strong>
                      <span className={`yr-row-value yr-tone-${row.tone}`}>{row.value}</span>
                      <span className="yr-row-chev" aria-hidden="true">›</span>
                    </button>
                  )
                })}
              </div>
              {error === 'closed' ? (
                <>
                  <Notice tone="error">{t('review.dayClosedError')}</Notice>
                  <Button variant="primary" className="yr-confirm" onClick={onClose}>
                    {t('yr.closedClose')}
                  </Button>
                </>
              ) : (
                <>
                  {error === 'save' && <Notice tone="error">{t('review.saveError')}</Notice>}
                  <Button variant="primary" className="yr-confirm" loading={saving} onClick={save}>
                    {t('yr.save')}
                  </Button>
                </>
              )}
            </div>
          )}
          {screen === 'done' && outcome && <YesterdayDone outcome={outcome} habits={habits} onContinue={onClose} />}
        </div>
      </div>
    </FullScreenModal>
  )
}
