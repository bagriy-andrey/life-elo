import { useMemo, useState } from 'react'
import { dayOf } from '../domain/day'
import {
  bestStreak,
  chartKind,
  completionPercent,
  currentStreak,
  habitNorms,
  weekdayAverages,
  weekdayPercent,
  weekStreaks,
} from '../domain/habitStats'
import { amountSeries, heatmapGrid, monthlyCounts, timeSeries, weeklySeries } from '../domain/habitCharts'
import { settingsOn } from '../domain/settings'
import type { DayReview, Habit } from '../domain/types'
import { useI18n } from '../i18n'
import { Menu } from './components'
import type { MenuItem } from './components/Menu'
import { togglePause } from './habitActions'
import { AmountChart, MonthlyChart, WeeklyChart } from './habit/BarCharts'
import { Heatmap } from './habit/Heatmap'
import { TimeChart } from './habit/TimeChart'
import { WeekdayBars } from './habit/WeekdayBars'
import { amountBars, percentBars, timeBars, type WeekdayBar } from './habit/weekdayData'
import { HabitDeleteDialog } from './HabitDeleteDialog'
import { HabitSheet } from './HabitSheet'
import { habitMeta } from './labels'
import './HabitPage.css'

const todayKey = () => dayOf(new Date())
const clock = (m: number) => {
  const d = ((m % 1440) + 1440) % 1440
  return `${String(Math.floor(d / 60)).padStart(2, '0')}:${String(d % 60).padStart(2, '0')}`
}

interface Props {
  /** `undefined` renders nothing (App redirects to the list). */
  habit: Habit | undefined
  habits: Habit[]
  reviews: DayReview[]
  effectiveFrom: string
  onBack: () => void
  /** Day key used for all stats; defaults to today. */
  today?: string
}

export function HabitPage({ habit, habits, reviews, effectiveFrom, onBack, today = todayKey() }: Props) {
  const { t, locale } = useI18n()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const data = useMemo(() => {
    if (!habit) return undefined
    const kind = chartKind(habit, today)
    const streaks =
      kind === 'weekly'
        ? weekStreaks(habit, reviews, today)
        : { current: currentStreak(habit, reviews, today), best: bestStreak(habit, reviews, today) }
    return {
      kind,
      streaks,
      percent: completionPercent(habit, reviews, today),
      amount: kind === 'amount' ? amountSeries(habit, reviews, today) : undefined,
      months: kind === 'yesno' ? monthlyCounts(habit, reviews, today) : undefined,
      time: kind === 'time' ? timeSeries(habit, reviews, today) : undefined,
      weeks: kind === 'weekly' ? weeklySeries(habit, reviews, today) : undefined,
      grid: heatmapGrid(habit, reviews, today),
      norms: habitNorms(habit, today),
      weekdays: weekdayPercent(habit, reviews, today),
      averages: weekdayAverages(habit, reviews, today),
    }
  }, [habit, reviews, today])

  if (!habit || !data) return null

  const version = settingsOn(habit, today)
  const destructive = habit.direction === 'destructive'
  const weekly = data.kind === 'weekly'
  const unit = (n: number) => t(weekly ? 'habit.unit.week' : 'habit.unit.day', { count: n })
  const holding = destructive && data.kind === 'yesno'
  const amountUnit = version.rule.kind === 'measured' && version.rule.unit !== 'time' ? version.rule.unit : 'count'

  // «По дням недели» per habit type; steps have none.
  let weekday: { bars: WeekdayBar[]; caption: string } | undefined
  if (data.kind === 'yesno') weekday = { bars: percentBars(data.weekdays, false), caption: t('habit.weekdays.caption') }
  else if (weekly)
    weekday = {
      bars: percentBars(data.weekdays, true),
      caption: t(destructive ? 'habit.weekdays.captionWeeklyBad' : 'habit.weekdays.captionWeeklyGood'),
    }
  else if (data.kind === 'time')
    weekday = { bars: timeBars(data.weekdays, data.averages, data.norms, clock), caption: t('habit.weekdays.captionTime') }
  else if (amountUnit === 'minutes')
    weekday = {
      bars: amountBars(data.averages, habit, data.norms, (v) => String(Math.round(v))),
      caption: t('habit.weekdays.captionMinutes'),
    }
  else if (amountUnit === 'count')
    weekday = {
      bars: amountBars(data.averages, habit, data.norms, (v) => v.toLocaleString(locale, { maximumFractionDigits: 1 })),
      caption: t('habit.weekdays.captionCount'),
    }

  const items: MenuItem[] = [
    { id: 'edit', label: t('habit.menu.edit') },
    { id: 'pause', label: t(habit.active ? 'habit.menu.pause' : 'habit.menu.resume') },
    { id: 'delete', label: t('habit.menu.delete'), tone: 'danger', separatorBefore: true },
  ]
  const actions: Record<string, () => void> = {
    edit: () => setEditing(true),
    pause: () => void togglePause(habit),
    delete: () => setDeleting(true),
  }

  const stats = [
    {
      label: t(holding ? 'habit.stat.holding' : 'habit.stat.current'),
      value: `${data.streaks.current} ${unit(data.streaks.current)}`,
    },
    { label: t('habit.stat.best'), value: `${data.streaks.best} ${unit(data.streaks.best)}` },
    { label: t('habit.stat.completion'), value: data.percent === null ? '—' : `${data.percent}%` },
  ]

  return (
    <section className="habit-page stack">
      <div className="habit-page-bar">
        <button type="button" className="habit-page-back" onClick={onBack}>
          ‹ {t('habit.back')}
        </button>
        <Menu items={items} triggerLabel={t('habit.menu.aria')} onSelect={(id) => actions[id]?.()} />
      </div>

      <header className="habit-page-head">
        <div className="habit-page-title">
          <span className={destructive ? 'habit-page-dot neg' : 'habit-page-dot'} aria-hidden="true" />
          <h1>{habit.name}</h1>
          {!habit.active && <span className="habit-page-badge">{t('habit.badge.paused')}</span>}
        </div>
        <span className="habit-page-meta">{habitMeta(t, habit.direction, version)}</span>
      </header>

      <div className="habit-page-stats">
        {stats.map((s) => (
          <div key={s.label} className="habit-stat">
            <span className="habit-stat-label">{s.label}</span>
            <strong className="habit-stat-value">{s.value}</strong>
          </div>
        ))}
      </div>

      {data.amount && <AmountChart series={data.amount} direction={habit.direction} unit={amountUnit} />}
      {data.months && <MonthlyChart months={data.months} direction={habit.direction} />}
      {data.time && <TimeChart series={data.time} />}
      {data.weeks && <WeeklyChart series={data.weeks} direction={habit.direction} />}

      <section className="habit-page-card" aria-label={t('habit.heatmap.title')}>
        <strong>{t('habit.heatmap.title')}</strong>
        <Heatmap grid={data.grid} kind={data.kind} direction={habit.direction} />
      </section>

      {weekday && <WeekdayBars bars={weekday.bars} caption={weekday.caption} />}

      {editing && (
        <HabitSheet
          key={habit.id}
          habit={habit}
          habits={habits}
          reviews={reviews}
          effectiveFrom={effectiveFrom}
          onClose={() => setEditing(false)}
        />
      )}
      <HabitDeleteDialog
        habit={deleting ? habit : undefined}
        onClose={() => setDeleting(false)}
        onDeleted={() => {
          setDeleting(false)
          onBack()
        }}
      />
    </section>
  )
}
