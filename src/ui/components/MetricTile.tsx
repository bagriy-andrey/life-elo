import type { ReactNode } from 'react'
import { cx } from './cx'
import { Skeleton } from './Skeleton'
import './MetricTile.css'

interface Props {
  /** Renders an <a> when set, otherwise a <button type="button">. */
  href?: string
  onClick?: () => void
  /** Inline SVG (16px, currentColor); decorative. */
  icon: ReactNode
  title: string
  /** Big value (1.5rem/700); use «—» when the metric is missing. */
  value: ReactNode
  /** Muted small text after the value, e.g. «/ 100». */
  unit?: ReactNode
  /** Muted extra-small line under the value. */
  sub?: ReactNode
  /** Pinned to the bottom of the tile. */
  footer?: ReactNode
  /** Shows skeleton placeholders instead of value/sub/footer. */
  loading?: boolean
  className?: string
}

/** Card-styled tappable metric tile (link or button); min height 150px, tap target ≥44px, text colour inherited. */
export function MetricTile({ href, onClick, icon, title, value, unit, sub, footer, loading, className }: Props) {
  const body = (
    <>
      <span className="mtile-title">
        <span className="mtile-icon" aria-hidden="true">{icon}</span>
        <span className="mtile-title-text">{title}</span>
      </span>
      {loading ? (
        <>
          <Skeleton width="60%" height="1.5rem" />
          <Skeleton width="80%" height="0.75rem" />
        </>
      ) : (
        <>
          <span className="mtile-value">
            {value}
            {unit != null && <span className="mtile-unit"> {unit}</span>}
          </span>
          {sub != null && <span className="mtile-sub">{sub}</span>}
          {footer != null && <span className="mtile-footer">{footer}</span>}
        </>
      )}
    </>
  )
  const cls = cx('mtile', className)
  if (href) {
    return (
      <a className={cls} href={href} onClick={onClick} aria-busy={loading || undefined}>
        {body}
      </a>
    )
  }
  return (
    <button type="button" className={cls} onClick={onClick} aria-busy={loading || undefined}>
      {body}
    </button>
  )
}
