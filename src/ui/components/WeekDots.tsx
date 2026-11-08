import { cx } from './cx'
import './WeekDots.css'

interface Props {
  /** How many of the 7 days are counted (clamped to 0–7). */
  value: number
  /** constructive: first `value` green, rest dim. destructive: first `value` muted (allowed), rest red-tinted. */
  direction: 'constructive' | 'destructive'
  className?: string
}

export function WeekDots({ value, direction, className }: Props) {
  const n = Math.max(0, Math.min(7, Math.round(value)))
  return (
    <div className={cx('week-dots', className)} aria-hidden="true">
      {Array.from({ length: 7 }, (_, i) => {
        const filled = i < n
        const tone = direction === 'constructive' ? (filled ? 'pos' : 'rest') : filled ? 'allowed' : 'over'
        return <span key={i} className={`week-dot week-dot-${tone}`} />
      })}
    </div>
  )
}
