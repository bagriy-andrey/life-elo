import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { toDayKey } from '../domain/day'
import { db } from '../db/db'
import type { GarminDay, GarminDetail } from '../domain/types'
import { garminDayDigest, type GarminDayDigest, type StressLevel, type Tone } from '../garmin/dayDigest'
import { flattenForTree, watchOffsetMs } from '../garmin/detailView'
import { humanizeType } from '../garmin/ui'
import { useGarminSync } from '../garmin/useGarminSync'
import { useI18n } from '../i18n'
import type { Key } from '../i18n/types'
import { Card, FactGrid, LegendRow, ProgressBar, RangeScale, SegmentBar, type SegmentColor } from './components'
import { LineSeriesChart } from './garmin/LineSeriesChart'
import { formatClock, formatDayShort, formatDelta, formatDistance, formatDuration, formatNumber } from './format'
import type { GarminSection } from './route'
import './GarminDayPage.css'

interface Props {
  day: string
  onBack: () => void
  /** Today's day key (the page marks it «день идёт»); defaults to the device date. */
  today?: string
  /** Section to scroll to on open. */
  section?: GarminSection
  /** «‹ Назад» (opened from the review) instead of «‹ Главная». */
  backLabel?: 'home' | 'back'
  /** Test seam: skip the status cache/`status()` (`null` = unknown sync). */
  sync?: { at: string | null; now?: Date }
  /** Test seam: skip the live Dexie read (`detail: undefined` = none stored). */
  data?: { detail?: GarminDetail; row?: GarminDay }
  /** Intensity minutes of the week so far (moderate + 2 * vigorous); unknown until the week is loaded. */
  weekIntensity?: number
}

const pad = (n: number) => String(n).padStart(2, '0')

const STAGE_COLOR = { deep: 'tier-weak', light: 'tier-medium', rem: 'tier-strong', awake: 'muted' } as const
const STRESS_COLOR: Record<StressLevel, SegmentColor> = {
  rest: 'tier-weak',
  activity: 'pos',
  low: 'tier-strong',
  medium: 'warn',
  high: 'neg',
  uncategorized: 'muted',
}
const toneClass = (tone: Tone) => (tone === 'plain' ? undefined : `garmin-tone-${tone}`)
const SLEEP_CHIP_KEY = {
  totalDuration: 'garmin.day.i.sleepScore.totalDuration',
  awakeCount: 'garmin.day.i.sleepScore.awakeCount',
  restlessness: 'garmin.day.i.sleepScore.restlessness',
  stress: 'garmin.day.f.sleepStress',
} as const

export function GarminDayPage({ day, onBack, today, section, backLabel = 'home', sync, data, weekIntensity }: Props) {
  const { t, locale } = useI18n()
  const live = useLiveQuery(async () => {
    const [detail, row] = await Promise.all([db.garminDetail.get(day), db.garmin.get(day)])
    return { detail, row }
  }, [day])
  const loaded = data ?? live
  const cached = useGarminSync()
  const syncAt = sync ? sync.at : (cached?.deviceLastSyncAt ?? cached?.lastPullAt ?? null)
  const [mountedAt] = useState(() => new Date())
  const nowDate = sync?.now ?? mountedAt
  const todayKey = today ?? toDayKey(nowDate)
  const inProgress = day === todayKey
  const ready = !!loaded
  useEffect(() => {
    if (ready && section) document.getElementById(section)?.scrollIntoView?.({ block: 'start' })
  }, [ready, section])
  const tk = (k: string, params?: Record<string, string | number>) => t(k as Key, params)

  const stale = syncAt ? nowDate.getTime() - new Date(syncAt).getTime() > 24 * 3600_000 : false
  const syncText = syncAt
    ? t(stale ? 'garmin.day.syncedYesterdayAt' : 'garmin.day.syncedAt', { time: formatClock(new Date(syncAt)) })
    : undefined
  const caption = [syncText, inProgress ? t('garmin.day.inProgressTail') : undefined].filter(Boolean).join(' ')
  const header = (
    <div className="garmin-page-bar">
      <button type="button" className="garmin-page-back" onClick={onBack}>
        {backLabel === 'home' ? t('garmin.day.backHome') : `‹ ${t('garmin.day.back')}`}
      </button>
    </div>
  )
  if (!loaded) return <section className="garmin-page stack">{header}</section>

  const detail = loaded.detail && Object.keys(loaded.detail).length ? stripDay(loaded.detail) : undefined
  const d: GarminDayDigest = garminDayDigest(day, todayKey, loaded.row, detail)
  const offset = watchOffsetMs(detail)
  const clock = (ms: number) => {
    const dt = new Date(ms + offset)
    return `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`
  }
  const n = (v: number, digits = 0) => formatNumber(v, locale, digits)
  const unit = (u: string) => tk(`garmin.day.unit.${u}`)
  const withUnit = (v: number, u: string, digits = 0) => `${n(v, digits)} ${unit(u)}`
  const dur = (sec: number) => formatDuration(sec, locale)
  const pct = (v: number) => `${v}%`
  const dash = '—'
  const opt = (v: number | undefined, u: string, digits = 0) => (v === undefined ? dash : withUnit(v, u, digits))
  const facts = (items: { label: string; value: string }[]) => <FactGrid items={items} />
  const heading = (id: string, title: string, right?: React.ReactNode) => (
    <div className="garmin-sec-head">
      <h2 id={`${id}-h`}>{title}</h2>
      {right && <span className="garmin-cap">{right}</span>}
    </div>
  )
  const stat = (v: React.ReactNode) => <strong className="garmin-big">{v}</strong>

  const { sleep, steps, recovery: rec, stress, respiration, spo2 } = d

  const sleepSection = (
    <Card id="sleep" className="garmin-page-card" aria-labelledby="sleep-h">
      {heading('sleep', t('garmin.day.section.sleep'), t('garmin.day.sleepNight', { day: formatDayShort(day, locale) }))}
      {sleep ? (
        <>
          <div className="garmin-split">
            <div className="garmin-col">
              {stat(dur(sleep.durationSec))}
              <span className="garmin-cap">
                {[
                  sleep.start && sleep.end ? `${sleep.start} → ${sleep.end}` : undefined,
                  sleep.needMin !== undefined ? t('garmin.day.sleepNeed', { h: dur(sleep.needMin * 60) }) : undefined,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
            {sleep.score !== undefined && (
              <div className={`garmin-col garmin-col-end ${toneClass(sleep.tone) ?? ''}`}>
                {stat(n(sleep.score))}
                {sleep.qualifier && <span className="garmin-status">{tk(`garmin.day.q.${sleep.qualifier}`)}</span>}
              </div>
            )}
          </div>
          {sleep.stages.length > 0 && (
            <div className="garmin-block">
              <span className="garmin-cap">{t('garmin.day.chart.sleepStages')}</span>
              <SegmentBar
                segments={sleep.stages.map((s) => ({
                  key: s.key,
                  label: tk(`garmin.day.sleepStage.${s.key}`),
                  value: s.seconds,
                  color: STAGE_COLOR[s.key],
                }))}
              />
              <div className="garmin-legend">
                {sleep.stages.map((s) => (
                  <LegendRow
                    key={s.key}
                    color={STAGE_COLOR[s.key]}
                    name={tk(`garmin.day.sleepStage.${s.key}`)}
                    value={dur(s.seconds)}
                    percent={pct(s.pct)}
                  />
                ))}
              </div>
            </div>
          )}
          {sleep.chips.length > 0 && (
            <ul className="garmin-chips">
              {sleep.chips.map((c) => (
                <li key={c.key} className="garmin-chip">
                  {tk(SLEEP_CHIP_KEY[c.key])} · <span className={toneClass(c.tone)}>{tk(`garmin.day.q.${c.qualifier}`).toLowerCase()}</span>
                </li>
              ))}
            </ul>
          )}
          {facts([
            { label: t('garmin.day.f.sleepHr'), value: opt(sleep.avgHr, 'bpm') },
            { label: t('garmin.day.f.sleepResp'), value: opt(sleep.respiration, 'brpm') },
            {
              label: t('garmin.day.f.sleepSpo2'),
              value:
                sleep.spo2Avg === undefined
                  ? dash
                  : [withUnit(sleep.spo2Avg, '%'), sleep.spo2Low !== undefined ? t('garmin.day.f.minValue', { n: n(sleep.spo2Low) }) : undefined]
                      .filter(Boolean)
                      .join(' · '),
            },
            { label: t('garmin.day.f.sleepStress'), value: sleep.stress === undefined ? dash : n(sleep.stress) },
          ])}
        </>
      ) : (
        <p className="muted garmin-none">{dash}</p>
      )}
    </Card>
  )

  const hrv = rec.hrv
  const hrvWord = hrv?.position
    ? t(`body.hrvNorm.${hrv.position}` as Key)
    : hrv?.status
      ? tk(`garmin.day.hrvStatus.${hrv.status}`)
      : undefined
  const bbPoints = rec.bbCurve.map(([tt, v]) => ({ t: tt, v }))
  const recoverySection = (
    <Card id="recovery" className="garmin-page-card" aria-labelledby="recovery-h">
      {heading('recovery', t('body.tile.recovery'))}
      <div className="garmin-split">
        <div className="garmin-col">
          <span className="garmin-cap">{t('garmin.day.f.bbNow')}</span>
          {stat(
            rec.bbNow === undefined ? (
              dash
            ) : (
              <>
                {n(rec.bbNow)}
                <span className="garmin-big-unit"> / {rec.bbMax}</span>
              </>
            ),
          )}
        </div>
        {(rec.bbCharged !== undefined || rec.bbDrained !== undefined) && (
          <span className="garmin-cap garmin-col-end garmin-bb-delta">
            {rec.bbCharged !== undefined && (
              <span>
                {t('garmin.day.overNight')} <b className="garmin-tone-pos">{formatDelta(rec.bbCharged)}</b>
              </span>
            )}
            {rec.bbDrained !== undefined && (
              <span>
                {t('garmin.day.overDay')} <b className="garmin-tone-neg">{formatDelta(-Math.abs(rec.bbDrained))}</b>
              </span>
            )}
          </span>
        )}
      </div>
      {bbPoints.length > 1 && (
        <LineSeriesChart points={bbPoints} formatTick={clock} formatValue={(v) => String(Math.round(v))} formatAxis={(v) => String(Math.round(v))} label={t('garmin.day.chart.bodyBattery')} />
      )}
      {hrv?.value !== undefined && (
        <div className="garmin-block garmin-divided">
          <div className="garmin-split garmin-baseline">
            <span>
              {t('garmin.day.f.hrvNight')} <b className="garmin-num">{withUnit(hrv.value, 'ms')}</b>
            </span>
            {hrvWord && <span className={`garmin-status ${toneClass(hrv.tone) ?? ''}`}>{hrvWord}</span>}
          </div>
          {hrv.scaleMin !== undefined && hrv.scaleMax !== undefined && hrv.scaleMax > hrv.scaleMin && (
            <RangeScale
              min={hrv.scaleMin}
              max={hrv.scaleMax}
              value={hrv.value}
              corridor={hrv.baseline}
              tone={hrv.tone === 'plain' ? 'accent' : hrv.tone}
              lowLabel={n(hrv.scaleMin)}
              highLabel={n(hrv.scaleMax)}
              corridorLabel={hrv.baseline ? t('garmin.day.norm', { lo: n(hrv.baseline.low), hi: n(hrv.baseline.high) }) : undefined}
            />
          )}
          {hrv.weeklyAvg !== undefined && hrv.peak5Min !== undefined && (
            <span className="garmin-cap">
              {t('garmin.day.f.hrvWeekPeak', { avg: n(hrv.weeklyAvg), peak: n(hrv.peak5Min) })}
            </span>
          )}
        </div>
      )}
      {facts([
        { label: t('garmin.day.f.restingHr'), value: opt(rec.restingHr, 'bpm') },
        { label: t('garmin.day.f.last7'), value: opt(rec.restingHrWeek, 'bpm') },
        { label: t('garmin.day.f.hrMin'), value: opt(rec.hrMin, 'bpm') },
        { label: t('garmin.day.f.hrMax'), value: opt(rec.hrMax, 'bpm') },
      ])}
    </Card>
  )

  const im = d.intensity
  const imValue = weekIntensity ?? im?.dayMinutes
  const activitySection = (
    <Card id="activity" className="garmin-page-card" aria-labelledby="activity-h">
      {heading('activity', t('garmin.day.section.activity'), inProgress && syncAt ? t('garmin.day.until', { time: formatClock(new Date(syncAt)) }) : undefined)}
      {steps ? (
        <div className="garmin-block">
          <div className="garmin-split garmin-baseline">
            {stat(
              <>
                {n(steps.value)}
                <span className="garmin-big-unit"> {unit('steps')}</span>
              </>,
            )}
            {steps.goal !== undefined && <span className="garmin-cap">{t('garmin.day.goal', { n: n(steps.goal) })}</span>}
          </div>
          {steps.goal !== undefined && steps.goal > 0 && <ProgressBar value={steps.value} max={steps.goal} label={tk('garmin.day.i.steps')} />}
        </div>
      ) : (
        <p className="muted garmin-none">{dash}</p>
      )}
      {im && imValue !== undefined && (
        <div className="garmin-block">
          <div className="garmin-split garmin-baseline garmin-small">
            <span>{t('garmin.day.intensityMinutes')}</span>
            <span className="garmin-num">
              {n(imValue)}{' '}
              {im.goal !== undefined && (
                <span className="muted">
                  {weekIntensity !== undefined ? t('garmin.day.ofPerWeek', { n: n(im.goal) }) : t('garmin.day.goal', { n: n(im.goal) })}
                </span>
              )}
            </span>
          </div>
          {im.goal !== undefined && im.goal > 0 && <ProgressBar value={imValue} max={im.goal} label={t('garmin.day.intensityMinutes')} />}
        </div>
      )}
      {facts([
        { label: t('garmin.day.f.distance'), value: steps?.distanceM === undefined ? dash : formatDistance(steps.distanceM, locale) },
        {
          label: t('garmin.day.f.floors'),
          value:
            steps?.floorsUp === undefined && steps?.floorsDown === undefined
              ? dash
              : t('garmin.day.f.floorsUpDown', { up: n(steps?.floorsUp ?? 0), down: n(steps?.floorsDown ?? 0) }),
        },
        { label: t('garmin.day.f.caloriesTotal'), value: opt(d.calories?.total, 'kcal') },
        { label: t('garmin.day.f.caloriesActive'), value: opt(d.calories?.active, 'kcal') },
      ])}
      <div className="garmin-workouts">
        <span className="garmin-small">{t('garmin.day.section.activities')}</span>
        {d.workouts.length === 0 ? (
          <span className="garmin-cap">{t('garmin.day.none')}</span>
        ) : (
          <ul className="garmin-workout-list">
            {d.workouts.map((w, i) => (
              <li key={i}>
                {humanizeType(w.type)} · {n(w.minutes)} {unit('min')}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )

  const stressTotal = stress?.segments.reduce((a, s) => a + s.seconds, 0) ?? 0
  const stressSection = (
    <Card id="stress" className="garmin-page-card" aria-labelledby="stress-h">
      {heading(
        'stress',
        t('garmin.day.section.stress'),
        stress && (stress.avg !== undefined || stress.max !== undefined) ? (
          <>
            {stress.avg !== undefined && (
              <>
                {t('garmin.day.avg')} <b className="garmin-strong">{n(stress.avg)}</b>
              </>
            )}
            {stress.avg !== undefined && stress.max !== undefined && ' · '}
            {stress.max !== undefined && (
              <>
                {t('garmin.day.max')} <b className="garmin-strong">{n(stress.max)}</b>
              </>
            )}
          </>
        ) : undefined,
      )}
      {stress && stress.segments.length > 0 ? (
        <>
          <SegmentBar
            segments={stress.segments.map((s) => ({
              key: s.level,
              label: tk(`garmin.day.stressLevel.${s.level}`),
              value: s.seconds,
              color: STRESS_COLOR[s.level],
            }))}
          />
          <div className="garmin-legend">
            {stress.segments.map((s) => (
              <LegendRow
                key={s.level}
                color={STRESS_COLOR[s.level]}
                name={tk(`garmin.day.stressLevel.${s.level}`)}
                value={dur(s.seconds)}
                percent={pct(Math.round((s.seconds / stressTotal) * 100))}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="muted garmin-none">{dash}</p>
      )}
    </Card>
  )

  const range =
    respiration?.min !== undefined && respiration.max !== undefined
      ? `${n(respiration.min)}–${n(respiration.max)} ${unit('brpm')}`
      : dash
  const breathSection = (
    <Card id="breath" className="garmin-page-card" aria-labelledby="breath-h">
      {heading('breath', t('garmin.day.section.respiration'))}
      {facts([
        { label: t('garmin.day.f.respAvg'), value: opt(respiration?.avg, 'brpm') },
        { label: t('garmin.day.f.range'), value: range },
        { label: t('garmin.day.f.spo2Avg'), value: opt(spo2?.avg, '%') },
        { label: t('garmin.day.f.spo2Min'), value: opt(spo2?.low, '%') },
        { label: t('garmin.day.f.spo2Week'), value: opt(spo2?.weekAvg, '%', 1) },
        { label: t('garmin.day.f.spo2Last'), value: opt(spo2?.latest, '%') },
      ])}
    </Card>
  )

  const rows = import.meta.env.DEV && detail ? flattenForTree(detail, (c) => t('garmin.day.points', { n: c })) : []

  return (
    <section className="garmin-page stack">
      {header}
      <h1 className="garmin-page-title">{formatDayShort(day, locale)}</h1>
      {caption && <p className="muted garmin-page-sync">{caption}</p>}
      {d.empty ? (
        <p className="muted garmin-page-nodetail">{t('garmin.day.empty')}</p>
      ) : (
        <>
          {!detail && <p className="muted garmin-page-nodetail">{t('garmin.day.noDetail')}</p>}
          {sleepSection}
          {recoverySection}
          {activitySection}
          {stressSection}
          {breathSection}
        </>
      )}
      {rows.length > 0 && (
        <Card className="garmin-page-card">
          <details className="garmin-page-fields">
            <summary>{t('garmin.day.allFields')}</summary>
            <dl className="garmin-page-tree">
              {rows.map((r) => (
                <div key={r.path} className="garmin-page-tree-row">
                  <dt>{r.path.split('.').flatMap((seg, i, arr) => (i < arr.length - 1 ? [seg, '.', <wbr key={i} />] : [seg]))}</dt>
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
