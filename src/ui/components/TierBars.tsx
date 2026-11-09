import { cx } from './cx'
import './TierBars.css'

interface Props {
  /** Filled bars (1-3); the rest of the 3 are dimmed. */
  level: 1 | 2 | 3
  /** sm = 6/9/12px bars; default 7/10/13px. */
  size?: 'sm'
}

/** Internal importance icon: three ascending bars. Not exported from the barrel. */
export function TierBars({ level, size }: Props) {
  return (
    <span className={cx('tier-bars', size && `tier-bars-${size}`)} aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <span key={i} className={cx('tier-bar', `bar-${i}`, i > level && 'dim')} />
      ))}
    </span>
  )
}
