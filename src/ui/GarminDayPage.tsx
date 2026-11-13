import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { GarminDay, GarminDetail } from '../domain/types'
import {
  flattenForTree,
  formatDistance,
  formatDuration,
  garminDayDetailView,
  watchOffsetMs,
  type DetailChart,
  type DetailGroup,
  type DetailItem,
  type DetailSection,
} from '../garmin/detailView'
import { useI18n } from '../i18n'
import type { Key } from '../i18n/types'
import { Card } from './components'
import { LineSeriesChart } from './garmin/LineSeriesChart'
import { MiniBars } from './garmin/MiniBars'
import { StackedBar } from './garmin/StackedBar'
import './GarminDayPage.css'

interface Props {
  day: string
  onBack: () => void
  /** Test seam: skip the live Dexie read (`detail: undefined` = none stored). */
  data?: { detail?: GarminDetail; row?: GarminDay }
}

/** `YYYY-MM-DD` as a local calendar date. */
function localDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const pad = (n: number) => String(n).padStart(2, '0')

export function GarminDayPage({ day, onBack, data }: Props) {
  const { t, locale } = useI18n()
  const live = useLiveQuery(async () => {
    const [detail, row] = await Promise.all([db.garminDetail.get(day), db.garmin.get(day)])
    return { detail, row }
  }, [day])
  const loaded = data ?? live
  const tk = (k: string, params?: Record<string, string | number>) => t(k as Key, params)

  const date = localDate(day).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
  const header = (
    <div className="garmin-page-bar">
      <button type="button" className="garmin-page-back" onClick={onBack}>
        ‹ {t('garmin.day.back')}
      </button>
    </div>
  )
  if (!loaded) return <section className="garmin-page stack">{header}</section>

  const detail = loaded.detail && Object.keys(loaded.detail).length ? stripDay(loaded.detail) : undefined
  const view = garminDayDetailView(detail, loaded.row)
  const offset = watchOffsetMs(detail)
  const clock = (ms: number) => {
    const d = new Date(ms + offset)
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  }
  const num = (v: number) => v.toLocaleString(locale, { maximumFractionDigits: 1 })

  const formatValue = (value: number, unit: DetailItem['unit']) => {
    if (unit === 'sec') return formatDuration(value, locale)
    if (unit === 'm') return formatDistance(value, locale)
    const n = num(value)
    return unit ? `${n} ${tk(`garmin.day.unit.${unit}`)}` : n
  }

  const renderItem = (it: DetailItem) => {
    let text: string
    if (it.valueKey) text = tk(it.valueKey)
    else if (typeof it.value === 'string') text = it.value
    else if (it.key === 'garmin.day.i.sleepNeed' && it.unit === 'min') text = formatDuration(it.value * 60, locale)
    else text = formatValue(it.value, it.unit)
    return (
      <div key={it.key} className="garmin-page-row">
        <dt>{tk(it.key)}</dt>
        <dd>
          {text}
          {it.qualifierKey && <span className="garmin-page-qual">{tk(it.qualifierKey)}</span>}
        </dd>
      </div>
    )
  }

  const items = (list: DetailItem[]) => list.length > 0 && <dl className="garmin-page-rows">{list.map(renderItem)}</dl>

  const renderChart = (c: DetailChart) => {
    const title = tk(c.titleKey)
    let chart
    if (c.kind === 'line') {
      chart = (
        <LineSeriesChart
          points={c.points}
          band={c.band}
          formatTick={clock}
          formatValue={c.unit ? (v) => formatValue(v, c.unit) : undefined}
          label={title}
        />
      )
    } else if (c.kind === 'stacked') {
      chart = (
        <StackedBar
          segments={c.segments.map((s) => ({ key: s.key, label: tk(s.key), value: s.value }))}
          format={(v) => formatDuration(v, locale)}
          label={title}
        />
      )
    } else {
      chart = <MiniBars bars={c.bars} formatValue={c.unit ? (v) => formatValue(v, c.unit) : undefined} label={title} />
    }
    return (
      <figure key={c.id} className="garmin-page-chart">
        <figcaption>{title}</figcaption>
        {chart}
      </figure>
    )
  }

  const group = (g: DetailGroup, i: number) => (
    <div key={i} className="garmin-page-group">
      <h3>{g.titleKey ? tk(g.titleKey) : g.title}</h3>
      {items(g.items)}
      {g.charts?.map(renderChart)}
    </div>
  )

  const sectionCard = (s: DetailSection) => (
    <Card key={s.id} className="garmin-page-card" aria-labelledby={`garmin-sec-${s.id}`}>
      <h2 id={`garmin-sec-${s.id}`}>{tk(`garmin.day.section.${s.id}`)}</h2>
      {items(s.items)}
      {s.charts?.map(renderChart)}
      {s.groups?.map(group)}
    </Card>
  )

  const rows = detail ? flattenForTree(detail, (n) => t('garmin.day.points', { n })) : []

  return (
    <section className="garmin-page stack">
      {header}
      <h1 className="garmin-page-title">{t('garmin.day.title', { date })}</h1>
      {view.summaryOnly && <p className="muted garmin-page-nodetail">{t('garmin.day.noDetail')}</p>}
      {view.sections.map(sectionCard)}
      {rows.length > 0 && (
        <Card className="garmin-page-card">
          <details className="garmin-page-fields">
            <summary>{t('garmin.day.allFields')}</summary>
            <dl className="garmin-page-tree">
              {rows.map((r) => (
                <div key={r.path} className="garmin-page-tree-row">
                  <dt>{r.path}</dt>
                  <dd>{String(r.value)}</dd>
                </div>
              ))}
            </dl>
          </details>
        </Card>
      )}
    </section>
  )
}

/** Dexie rows carry the key `day` next to the detail blocks; it is not part of the Garmin data. */
function stripDay(row: GarminDetail & { day?: string }): GarminDetail {
  const { day: _day, ...rest } = row
  void _day
  return rest
}
