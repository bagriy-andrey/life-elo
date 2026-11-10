import { useI18n } from '../../i18n'
import type { WeekdayBar } from './weekdayData'
import './WeekdayBars.css'

/** Mon..Sun bars (build them with `weekdayData.ts`). `caption`: right-hand note in the header. */
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
          <div key={i} className="weekday-bars__col">
            {b.label !== undefined && <span className="weekday-bars__pct">{b.label}</span>}
            <div className="weekday-bars__track">
              <span
                className={`weekday-bars__bar weekday-bars__bar--${b.fill}`}
                style={{ height: `${Math.round((b.ratio ?? 0) * 100)}%` }}
              />
            </div>
            <span className="weekday-bars__label">{fmt.format(new Date(2024, 0, 1 + i)) /* 2024-01-01 is a Monday */}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
