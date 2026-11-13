import './StackedBar.css'

export interface StackedBarProps {
  /** Order = scale order (colors are an ordered sequential scale, index 0 = darkest). `label` is already translated. */
  segments: { key: string; label: string; value: number }[]
  format: (value: number) => string
  /** Accessible summary of the whole bar. */
  label: string
}

const SCALE = 6

export function StackedBar({ segments, format, label }: StackedBarProps) {
  const shown = segments
    .map((s, i) => ({ ...s, i }))
    .filter((s) => Number.isFinite(s.value) && s.value > 0)
  const total = shown.reduce((a, s) => a + s.value, 0)
  if (total <= 0) return <div className="stacked-bar stacked-bar--empty" role="img" aria-label={label} />
  const pct = (v: number) => Math.round((v / total) * 100)
  return (
    <div className="stacked-bar" role="group" aria-label={label}>
      <div className="stacked-bar__track" role="img" aria-label={label}>
        {shown.map((s) => (
          <span
            key={s.key}
            className={`stacked-bar__seg stacked-bar__seg--${s.i % SCALE}`}
            style={{ flexGrow: s.value }}
          />
        ))}
      </div>
      <ul className="stacked-bar__legend">
        {shown.map((s) => (
          <li key={s.key} className="stacked-bar__row">
            <span className={`stacked-bar__swatch stacked-bar__seg--${s.i % SCALE}`} />
            <span className="stacked-bar__name">{s.label}</span>
            <strong className="stacked-bar__val">{format(s.value)}</strong>
            <span className="stacked-bar__pct">{`${pct(s.value)}%`}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
