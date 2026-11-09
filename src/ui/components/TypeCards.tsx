import { cx } from './cx'
import './TypeCards.css'

export interface TypeCardOption<T extends string> {
  value: T
  title: string
  description: string
  /** pos = green "+" circle, neg = red "−" circle. */
  tone: 'pos' | 'neg'
}

interface Props<T extends string> {
  options: TypeCardOption<T>[]
  value?: T
  onChange: (value: T) => void
  /** Accessible name of the radio group. */
  label: string
  /** Locks the choice (e.g. direction fixed once the habit has answers). */
  disabled?: boolean
  className?: string
}

export function TypeCards<T extends string>({ options, value, onChange, label, disabled, className }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('type-cards', className)}>
      {options.map((o) => {
        const on = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            className={cx('type-card', on && 'on', on && `tone-${o.tone}`)}
            onClick={() => onChange(o.value)}
          >
            <span className={cx('type-card-icon', `tone-${o.tone}`)} aria-hidden="true">{o.tone === 'pos' ? '+' : '−'}</span>
            <strong>{o.title}</strong>
            <span className="type-card-desc">{o.description}</span>
          </button>
        )
      })}
    </div>
  )
}
