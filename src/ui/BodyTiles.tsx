import { useState, type MouseEvent, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { GarminDetail } from '../domain/types'
import { garminDayDigest, type GarminDayDigest, type Tone } from '../garmin/dayDigest'
import { humanizeType } from '../garmin/ui'
import { useGarminSync } from '../garmin/useGarminSync'
import { useI18n } from '../i18n'
import type { Key } from '../i18n/types'
import { Banner, MetricTile, ProgressBar } from './components'
import { formatDuration, formatNumber, formatSyncTime } from './format'
import { ActivityIcon, BatteryIcon, FootprintsIcon, MoonIcon } from './garmin/icons'
import { routePath, type GarminSection } from './route'
import './BodyTiles.css'

export type BodyState = 'loading' | 'notConnected' | 'ready'

interface ViewProps {
  state: BodyState
  today: string
  digest?: GarminDayDigest
  /** ISO time of the last Garmin sync; hidden when unknown. */
  syncAt?: string | null
  now: Date
  onOpen: (section: GarminSection) => void
  onConnect: () => void
}

const dash = '—'

function Dot({ tone }: { tone: Tone }) {
  return <span className={`body-dot${tone === 'plain' ? '' : ` ${tone}`}`} aria-hidden="true" />
}

/** Presentational «Тело» block (no data access). */
export function BodyTilesView({ state, today, digest, syncAt, now, onOpen, onConnect }: ViewProps) {
  const { t, locale } = useI18n()
  const tk = (k: string, params?: Record<string, string | number>) => t(k as Key, params)
  if (state === 'notConnected') {
    return <Banner title={t('garmin.connectBanner.title')} onClick={onConnect} />
  }
  const loading = state === 'loading'
  const n = (v: number) => formatNumber(v, locale)
  const link = (section: GarminSection) => ({
    href: routePath({ tab: 'home', garminDay: today, section }),
    onClick: (e: MouseEvent<HTMLElement>) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      e.preventDefault()
      onOpen(section)
    },
  })
  const withUnits = (text: string): ReactNode =>
    text.split(/(\d+)/).map((part, i) =>
      /\d/.test(part) || !part.trim() ? part : (
        <span key={i} className="mtile-unit">
          {` ${part.trim()} `}
        </span>
      ),
    )
  const d = digest
  const sleep = d?.sleep
  const hrv = d?.recovery.hrv
  const rec = d?.recovery
  const workouts = d?.workouts ?? []
  const first = workouts[0]
  const unitMin = tk('garmin.day.unit.min')
  const loadingProps = { loading, loadingLabel: t('common.loading') }
  const syncText = syncAt ? formatSyncTime(syncAt, now, t) : undefined

  return (
    <>
      <div className="body-head">
        <h2>{t('body.title')}</h2>
        {syncText && <span className="body-synced">{t('body.syncedAt', { time: syncText })}</span>}
      </div>
      <div className="body-grid">
        <MetricTile
          {...link('sleep')}
          {...loadingProps}
          icon={<MoonIcon />}
          title={t('body.tile.sleep')}
          value={sleep ? withUnits(formatDuration(sleep.durationSec, locale)) : dash}
          sub={sleep?.start && sleep.end ? `${sleep.start} → ${sleep.end}` : undefined}
          footer={
            sleep?.score !== undefined ? (
              <span className="body-line">
                <Dot tone={sleep.tone} />
                <strong className="body-num">{sleep.score}</strong>
                {sleep.qualifier && <span className={`body-word ${sleep.tone}`}>{tk(`garmin.day.q.${sleep.qualifier}`)}</span>}
              </span>
            ) : undefined
          }
        />
        <MetricTile
          {...link('activity')}
          {...loadingProps}
          icon={<FootprintsIcon />}
          title={t('body.tile.steps')}
          value={d?.steps ? n(d.steps.value) : dash}
          sub={d?.steps?.goal !== undefined ? t('body.ofGoal', { goal: n(d.steps.goal) }) : undefined}
          footer={
            d?.steps ? (
              <span className="body-foot-col">
                {d.steps.goal !== undefined && (
                  <ProgressBar size="sm" value={d.steps.value} max={d.steps.goal} label={t('body.tile.steps')} />
                )}
                {d.partial && <span className="body-muted">{t('body.inProgress')}</span>}
              </span>
            ) : undefined
          }
        />
        <MetricTile
          {...link('recovery')}
          {...loadingProps}
          icon={<BatteryIcon />}
          title={t('body.tile.recovery')}
          value={rec?.bbNow !== undefined ? n(rec.bbNow) : dash}
          unit={rec?.bbNow !== undefined ? `/ ${rec.bbMax}` : undefined}
          sub={rec?.restingHr !== undefined ? t('body.recoveryHint', { n: n(rec.restingHr) }) : rec?.bbNow !== undefined ? 'Body Battery' : undefined}
          footer={
            hrv?.value !== undefined ? (
              <span className="body-line">
                <Dot tone={hrv.tone} />
                <span>{t('body.hrv', { n: n(hrv.value) })}</span>
                {hrv.position && <span className={`body-word ${hrv.tone}`}>{t(`body.hrvNorm.${hrv.position}` as Key)}</span>}
              </span>
            ) : undefined
          }
        />
        <MetricTile
          {...link('stress')}
          {...loadingProps}
          icon={<ActivityIcon />}
          title={t('body.tile.stress')}
          value={d?.stress?.avg !== undefined ? n(d.stress.avg) : dash}
          unit={d?.stress?.avg !== undefined ? t('body.stressWord') : undefined}
          sub={d?.stress?.restPct !== undefined ? t('body.calmShare', { p: d.stress.restPct }) : undefined}
          footer={
            first ? (
              <span className="body-line">
                {humanizeType(first.type)} · {n(first.minutes)} {unitMin}
                {workouts.length > 1 ? ` +${workouts.length - 1}` : ''}
              </span>
            ) : (
              <span className="body-muted">{t('body.noWorkouts')}</span>
            )
          }
        />
      </div>
    </>
  )
}

interface Props {
  today: string
  onOpenGarmin: (day: string, section: GarminSection) => void
  onOpenProfile: () => void
}

/** Home «Тело»: today's Garmin digest read live from Dexie, status from the per-device cache. */
export function BodyTiles({ today, onOpenGarmin, onOpenProfile }: Props) {
  const cache = useGarminSync()
  const data = useLiveQuery(async () => {
    const [row, detail] = await Promise.all([db.garmin.get(today), db.garminDetail.get(today)])
    return { row, detail }
  }, [today])
  const [now] = useState(() => new Date())
  // «Not connected» only when the status says so; while it is unknown and there is nothing to show, stay loading.
  let state: BodyState = 'ready'
  if (cache?.connected === false) state = 'notConnected'
  else if (!data || (cache === undefined && !data.row && !data.detail)) state = 'loading'
  let digest: GarminDayDigest | undefined
  if (data) {
    const { day: _day, ...rest } = (data.detail ?? {}) as GarminDetail & { day?: string }
    void _day
    digest = garminDayDigest(today, today, data.row, data.detail && Object.keys(rest).length ? rest : undefined)
  }
  return (
    <BodyTilesView
      state={state}
      today={today}
      digest={digest}
      syncAt={cache?.deviceLastSyncAt ?? cache?.lastPullAt ?? null}
      now={now}
      onOpen={(s) => onOpenGarmin(today, s)}
      onConnect={onOpenProfile}
    />
  )
}
