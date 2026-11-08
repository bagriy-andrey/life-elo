import { cx } from './cx'
import './QuotaDots.css'

interface Props {
  /** Occurrences already used this week. */
  used: number
  /** Effective weekly limit (one dot each). */
  limit: number
  /** Note under the dots, e.g. "Использовано 2 из 3" (the component has no built-in language). */
  note: string
  className?: string
}

export function QuotaDots({ used, limit, note, className }: Props) {
  const exhausted = used >= limit
  return (
    <div className={cx('quota-dots', exhausted ? 'quota-neg' : 'quota-warn', className)}>
      <div className="quota-row" aria-hidden="true">
        {Array.from({ length: Math.max(0, limit) }, (_, i) => (
          <span key={i} className={cx('quota-dot', i < used && 'quota-dot-used')} />
        ))}
      </div>
      <p className="quota-note">{note}</p>
    </div>
  )
}
