import { cx } from './cx'
import { TierBars } from './TierBars'
import './SegmentedControl.css'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  /** Selected color; accent when omitted. */
  tone?: 'pos' | 'neg'
  /** Importance bars (1-3) shown before the label; the rest of the 3 are dimmed. */
  bars?: 1 | 2 | 3
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
          {o.bars && <TierBars level={o.bars} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}
