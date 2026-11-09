import { useI18n } from '../../i18n'
import './WeekdayBars.css'

/** `percents`: Mon..Sun from `weekdayPercent`; `null` = no evaluated days. `caption`: right-hand note in the header. */
export function WeekdayBars({ percents, caption }: { percents: (number | null)[]; caption?: string }) {
  const { t, locale } = useI18n()
  const max = Math.max(0, ...percents.map((p) => p ?? 0))
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  return (
    <section className="weekday-bars" aria-label={t('habit.weekdays.title')}>
      <div className="weekday-bars__head">
        <strong>{t('habit.weekdays.title')}</strong>
        <span className="weekday-bars__caption">{caption ?? t('habit.weekdays.caption')}</span>
      </div>
      <div className="weekday-bars__grid">
        {percents.map((p, i) => {
          const best = p !== null && p === max && max > 0
          const label = fmt.format(new Date(2024, 0, 1 + i)) // 2024-01-01 is a Monday
          return (
            <div key={i} className="weekday-bars__col">
              <span className="weekday-bars__pct">{p === null ? '—' : `${p}%`}</span>
              <div className="weekday-bars__track">
                <span
                  className={`weekday-bars__bar${best ? ' weekday-bars__bar--best' : ''}`}
                  style={{ height: `${p ?? 0}%` }}
                />
              </div>
              <span className="weekday-bars__label">{label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
