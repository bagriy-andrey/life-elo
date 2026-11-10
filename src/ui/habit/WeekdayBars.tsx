import { useI18n } from '../../i18n'
import type { WeekdayBar } from './weekdayData'
import './WeekdayBars.css'

/** Last 7 days, today last (build the bars with `weekdayData.ts`). `caption`: right-hand note in the header. */
export function WeekdayBars({ bars, caption }: { bars: WeekdayBar[]; caption?: string }) {
  const { t, locale } = useI18n()
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  return (
    <section className="weekday-bars" aria-label={t('habit.weekdays.title')}>
      <div className="weekday-bars__head">
        <strong>{t('habit.weekdays.title')}</strong>
        {caption && <span className="weekday-bars__caption">{caption}</span>}
      </div>
      <div className="weekday-bars__grid">
        {bars.map((b, i) => (
          <div key={b.day} className={i === bars.length - 1 ? 'weekday-bars__col weekday-bars__col--today' : 'weekday-bars__col'}>
            {b.label !== undefined && <span className="weekday-bars__pct">{b.label}</span>}
            <div className="weekday-bars__track">
              <span
                className={`weekday-bars__bar weekday-bars__bar--${b.fill}`}
                style={{ height: `${Math.round((b.ratio ?? 0) * 100)}%` }}
              />
            </div>
            <span className="weekday-bars__label">{fmt.format(new Date(`${b.day}T12:00:00`))}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
