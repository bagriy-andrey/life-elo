import { useLayoutEffect, useRef, useState } from 'react'
import type { HeatCell, HeatLevel, heatmapGrid } from '../../domain/habitCharts'
import type { ChartKind } from '../../domain/habitStats'
import type { HabitDirection } from '../../domain/types'
import { useI18n } from '../../i18n'
import './Heatmap.css'

export interface HeatmapProps {
  grid: ReturnType<typeof heatmapGrid>
  kind: ChartKind
  direction: HabitDirection
}

const SCALE: HeatLevel[] = ['nodata', 1, 2, 3, 4]
/** Column width + gap, px (see Heatmap.css). */
const COL = 12
const GAP = 3

/** Whole week columns that fit into `width` px (at least one). */
const columnsThatFit = (width: number) => Math.max(1, Math.floor((width + GAP) / (COL + GAP)))

export function Heatmap({ grid, kind, direction }: HeatmapProps) {
  const { t, locale } = useI18n()
  // No scroll: show only the most recent weeks that fit; until measured, the CSS keeps the right edge (today) visible.
  const frame = useRef<HTMLDivElement>(null)
  const [cols, setCols] = useState<number>()
  useLayoutEffect(() => {
    const el = frame.current
    if (!el) return
    const measure = () => setCols(columnsThatFit(el.clientWidth))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const offset = cols === undefined ? 0 : Math.max(0, grid.weeks.length - cols)
  const weeks = grid.weeks.slice(offset)

  const date = (day: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${day}T12:00:00`).toLocaleDateString(locale, opts)
  const weekly = kind === 'weekly'
  const destructive = direction === 'destructive'
  const yesLabel = t(destructive && !weekly ? 'habit.heatmap.held' : 'habit.heatmap.done')
  const noLabel = t(destructive ? 'habit.heatmap.slipped' : 'habit.heatmap.missed')

  const tip = (c: HeatCell) => {
    if (c.level === 'future') return undefined
    let value = t('habit.heatmap.nodata')
    if (c.tooltipValue !== undefined) {
      value = typeof c.tooltipValue === 'boolean' ? (c.tooltipValue ? yesLabel : noLabel) : String(c.tooltipValue)
    }
    return t('habit.heatmap.cell', { date: date(c.day, { day: 'numeric', month: 'short' }), value })
  }
  const monthAt = new Map(grid.monthLabels.map((m) => [m.column, m.month]))
  // 2024-01-01 is a Monday; labels on Mon, Wed, Fri, Sun rows.
  const dayName = (i: number) => date(`2024-01-0${i + 1}`, { weekday: 'short' })
  const swatch = (cls: string) => <span key={cls} className={`heatmap-swatch heatmap-cell--${cls}`} />
  const key = (cls: string, label: string, strip = false) => (
    <span className="heatmap-key" key={cls + label}>
      <span className={strip ? `heatmap-swatch heatmap-strip heatmap-strip--${cls}` : `heatmap-swatch heatmap-cell--${cls}`} />
      {label}
    </span>
  )

  return (
    <div className="heatmap">
      <div className="heatmap-body">
        <div className="heatmap-days" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span key={i}>{i % 2 === 0 ? dayName(i) : ''}</span>
          ))}
        </div>
        <div className="heatmap-frame" ref={frame}>
          <div className="heatmap-grid" role="img" aria-label={t('habit.heatmap.title')}>
            {weeks.map((w, i) => (
              <div className="heatmap-col" key={w.weekStart} aria-hidden="true">
                <span className="heatmap-month">
                  {monthAt.has(i + offset) ? date(`${monthAt.get(i + offset)}-01`, { month: 'short' }) : ''}
                </span>
                {w.days.map((c) => (
                  <span key={c.day} className={`heatmap-cell heatmap-cell--${c.level}`} title={tip(c)} />
                ))}
                {weekly && (
                  <span
                    className={`heatmap-strip heatmap-strip--${w.weekMet === true ? 'pos' : w.weekMet === false ? 'neg' : 'none'}`}
                    title={w.weekMet == null ? undefined : t(w.weekMet ? 'habit.heatmap.weekMet' : 'habit.heatmap.weekNotMet')}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="heatmap-legend">
        {kind === 'yesno' && [key('pos', yesLabel), key('neg', noLabel), key('nodata', t('habit.heatmap.nodata'))]}
        {weekly && [
          key(destructive ? 'neg' : 'pos', destructive ? noLabel : yesLabel),
          key('nodata', t('habit.heatmap.nodata')),
          key('pos', t('habit.heatmap.weekMet'), true),
          key('neg', t('habit.heatmap.weekNotMet'), true),
        ]}
        {(kind === 'amount' || kind === 'time') && (
          <span className="heatmap-scale">
            <span>{t(kind === 'time' ? 'habit.heatmap.later' : 'habit.heatmap.less')}</span>
            {SCALE.map((l) => swatch(String(l)))}
            <span>{t(kind === 'time' ? 'habit.heatmap.earlier' : 'habit.heatmap.more')}</span>
          </span>
        )}
      </div>
    </div>
  )
}
