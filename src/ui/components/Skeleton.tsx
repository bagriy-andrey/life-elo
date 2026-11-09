import type { CSSProperties } from 'react'
import { cx } from './cx'
import './Skeleton.css'

interface Props {
  /** CSS width (default 100%). */
  width?: number | string
  /** CSS height (default 1em). */
  height?: number | string
  /** Border radius (default --radius-sm); "full" for circles/pills. */
  radius?: number | 'full'
  className?: string
  style?: CSSProperties
}

/** Shimmering placeholder block shown while data loads; decorative (aria-hidden). */
export function Skeleton({ width = '100%', height = '1em', radius, className, style }: Props) {
  return (
    <span
      className={cx('skeleton', className)}
      aria-hidden="true"
      style={{ width, height, borderRadius: radius === 'full' ? 'var(--radius-full)' : radius, ...style }}
    />
  )
}
