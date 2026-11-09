import { cx } from './cx'
import './Spinner.css'

interface Props {
  /** Diameter in px (default 18). Uses currentColor. */
  size?: number
  /** Accessible text; decorative (aria-hidden) when omitted. */
  label?: string
  className?: string
}

export function Spinner({ size = 18, label, className }: Props) {
  return (
    <span
      className={cx('spinner', className)}
      style={{ width: size, height: size }}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  )
}
