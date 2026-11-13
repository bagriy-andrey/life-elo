import { cx } from './cx'
import './ProgressBar.css'

interface Props {
  value: number
  max: number
  tone?: 'accent' | 'pos' | 'neg' | 'warn'
  /** Accessible name; the visible text beside the bar is the caller's. */
  label: string
  size?: 'sm' | 'md'
  className?: string
}

/** Horizontal meter (value of max), clamped to 0..max. */
export function ProgressBar({ value, max, tone = 'accent', label, size = 'md', className }: Props) {
  const safeMax = max > 0 ? max : 1
  const now = Math.min(Math.max(value, 0), safeMax)
  const pct = (now / safeMax) * 100
  return (
    <div
      className={cx('meter', `meter-${size}`, `meter-${tone}`, className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuenow={now}
      aria-valuemax={safeMax}
    >
      <span className="meter-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}
