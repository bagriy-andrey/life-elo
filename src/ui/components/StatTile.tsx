import { cx } from './cx'
import { TierBars } from './TierBars'
import './StatTile.css'

interface Props {
  title: string
  total: number
  tone: 'pos' | 'neg'
  rows: { label: string; value: number; level: 1 | 2 | 3 }[]
  className?: string
}

/** Read-only summary tile: dot + title + total, then one row per tier with importance bars and a count. */
export function StatTile({ title, total, tone, rows, className }: Props) {
  return (
    <div className={cx('stat-tile', className)}>
      <div className="stat-tile-head">
        <span className={cx('stat-tile-dot', `stat-tile-dot-${tone}`)} aria-hidden="true" />
        <span className="stat-tile-title">{title}</span>
        <span className="stat-tile-total">{total}</span>
      </div>
      <div className="stat-tile-body">
        {rows.map((r) => (
          <div key={r.level} className={cx('stat-tile-row', r.value === 0 && 'dim')}>
            <TierBars level={r.level} size="sm" />
            <span className="stat-tile-label">{r.label}</span>
            <span className="stat-tile-value">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
