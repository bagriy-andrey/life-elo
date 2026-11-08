import { cx } from './cx'
import './ProgressSegments.css'

interface Props {
  /** Number of cards (one segment each). */
  total: number
  /** Zero-based index of the current card: earlier segments are done, later ones pending. */
  current: number
  /** Counter text shown above the segments, e.g. "2 из 5" (the component has no built-in language). */
  counterLabel: string
  className?: string
}

export function ProgressSegments({ total, current, counterLabel, className }: Props) {
  return (
    <div className={cx('progress-segments', className)}>
      <p className="progress-counter">{counterLabel}</p>
      <div className="progress-bar" aria-hidden="true">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={cx('progress-segment', i < current ? 'progress-done' : i === current ? 'progress-current' : 'progress-pending')}
          />
        ))}
      </div>
    </div>
  )
}
