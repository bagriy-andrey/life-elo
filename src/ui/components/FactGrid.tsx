import { cx } from './cx'
import './FactGrid.css'

interface Props {
  items: { label: string; value: string; hint?: string }[]
  className?: string
}

/** Two-column grid of label / value facts (label muted, value tabular). */
export function FactGrid({ items, className }: Props) {
  return (
    <dl className={cx('fact-grid', className)}>
      {items.map((it) => (
        <div key={it.label} className="fact">
          <dt className="fact-label">{it.label}</dt>
          <dd className="fact-value">{it.value}</dd>
          {it.hint && <dd className="fact-hint">{it.hint}</dd>}
        </div>
      ))}
    </dl>
  )
}
