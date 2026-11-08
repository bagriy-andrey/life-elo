import { cx } from './cx'
import './Stepper.css'

interface Props {
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  decLabel: string
  incLabel: string
  /** Muted text left of the controls. */
  label?: string
  className?: string
}

export function Stepper({ value, min, max, onChange, decLabel, incLabel, label, className }: Props) {
  return (
    <div className={cx('stepper', className)}>
      {label && <span className="stepper-label">{label}</span>}
      <div className="stepper-controls">
        <button type="button" aria-label={decLabel} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <strong className="stepper-value">{value}</strong>
        <button type="button" aria-label={incLabel} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  )
}
