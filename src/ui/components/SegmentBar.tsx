import { cx } from './cx'
import './SegmentBar.css'

export type SegmentColor = 'tier-weak' | 'tier-medium' | 'tier-strong' | 'pos' | 'neg' | 'warn' | 'muted'

export interface Segment {
  key: string
  label: string
  value: number
  color: SegmentColor
}

interface Props {
  segments: Segment[]
  className?: string
}

/** Share of each segment in the total, in percent (zero/negative values -> 0). */
export function segmentShares(segments: Segment[]): number[] {
  const total = segments.reduce((s, x) => s + Math.max(x.value, 0), 0)
  return segments.map((x) => (total > 0 ? (Math.max(x.value, 0) / total) * 100 : 0))
}

/** Decorative 14px pill bar split into segments; the values live in the LegendRows beside it. */
export function SegmentBar({ segments, className }: Props) {
  const shares = segmentShares(segments)
  return (
    <div className={cx('segbar', className)} aria-hidden="true">
      {segments.map((s, i) =>
        shares[i] > 0 ? (
          <span key={s.key} className="segbar-part" style={{ width: `${shares[i]}%`, background: `var(--${s.color})` }} />
        ) : null,
      )}
    </div>
  )
}

interface RowProps {
  color: SegmentColor
  name: string
  /** Time / amount text, e.g. «1 ч 25 мин». */
  value: string
  /** Percent text, e.g. «17%». */
  percent: string
  className?: string
}

/** One legend line: swatch, name, value, percent (grid 12px 1fr auto 40px). */
export function LegendRow({ color, name, value, percent, className }: RowProps) {
  return (
    <div className={cx('lrow', className)}>
      <span className="lrow-sw" style={{ background: `var(--${color})` }} aria-hidden="true" />
      <span className="lrow-name">{name}</span>
      <b className="lrow-value">{value}</b>
      <i className="lrow-pct">{percent}</i>
    </div>
  )
}
