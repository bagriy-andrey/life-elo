import { cx } from './cx'
import type { SegmentOption } from './SegmentedControl'
import './ChipGroup.css'

interface Props<T extends string> {
  options: SegmentOption<T>[]
  value?: T
  onChange: (value: T) => void
  /** Accessible name of the radio group. */
  label: string
  className?: string
}

export function ChipGroup<T extends string>({ options, value, onChange, label, className }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('chip-group', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={cx('chip', value === o.value && 'on')}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
