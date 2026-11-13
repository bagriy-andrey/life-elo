import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { GarminRow } from '../db/db'
import { garminDaysView, humanizeType, NAMED_ACTIVITY_TYPES } from '../garmin/ui'
import { useI18n } from '../i18n'
import { BottomSheet } from './components'

interface Props {
  open: boolean
  onClose: () => void
  /** ISO time of the last successful pull (shown in the header); null/undefined = never. */
  lastPullAt?: string | null
  /** Test seam: rows to show instead of the live `db.garmin` query. */
  rows?: GarminRow[]
  /** Day card tapped: the caller closes the sheet and opens the day page. */
  onOpenDay?: (day: string) => void
}

/** `YYYY-MM-DD` as a local calendar date. */
function localDate(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function GarminDataSheet({ open, onClose, lastPullAt, rows, onOpenDay }: Props) {
  const { t, locale } = useI18n()
  const live = useLiveQuery(() => db.garmin.toArray(), [])
  const days = garminDaysView(rows ?? live ?? [])
  const none = t('garmin.data.none')
  const fmt = (day: string) => localDate(day).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'long' })
  const typeName = (k: string) =>
    (NAMED_ACTIVITY_TYPES as readonly string[]).includes(k) ? t(`garmin.type.${k as (typeof NAMED_ACTIVITY_TYPES)[number]}`) : humanizeType(k)

  return (
    <BottomSheet open={open} title={t('garmin.data.title')} onClose={onClose} closeLabel={t('habits.close')}>
      <div className="garmin-data">
        <p className="muted garmin-data-sync">
          {lastPullAt
            ? t('garmin.lastSync', { time: new Date(lastPullAt).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) })
            : t('garmin.neverSynced')}
        </p>
        {days.length === 0 ? (
          <p className="muted">{t('garmin.data.empty')}</p>
        ) : (
          <ul className="garmin-data-list">
            {days.map((d) => (
              <li key={d.day}>
                <button type="button" className="garmin-day" onClick={() => onOpenDay?.(d.day)}>
                <strong className="garmin-day-date">{fmt(d.day)}</strong>
                <dl className="garmin-day-rows">
                  <dt>{t('garmin.data.steps')}</dt>
                  <dd>{d.steps !== undefined ? d.steps.toLocaleString(locale) : none}</dd>
                  <dt>{t('garmin.data.sleep', { date: fmt(d.day) })}</dt>
                  <dd>{d.sleepStart && d.sleepEnd ? `${d.sleepStart} → ${d.sleepEnd}` : none}</dd>
                  <dt>{t('garmin.data.activities')}</dt>
                  <dd>
                    {d.activities.length === 0
                      ? none
                      : d.activities.map((a, i) => (
                          <span key={i} className="garmin-day-activity">
                            {`${typeName(a.type)} · ${t('garmin.data.minutes', { n: a.minutes })}`}
                          </span>
                        ))}
                  </dd>
                </dl>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  )
}
