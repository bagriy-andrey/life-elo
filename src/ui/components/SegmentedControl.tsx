import { cx } from './cx'
import './SegmentedControl.css'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  /** Selected color; accent when omitted. */
  tone?: 'pos' | 'neg'
}

interface Props<T extends string> {
  options: SegmentOption<T>[]
  value?: T
  onChange: (value: T) => void
}

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          className={cx(value === o.value && 'on', value === o.value && o.tone && `tone-${o.tone}`)}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
