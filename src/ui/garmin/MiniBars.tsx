import './MiniBars.css'

export interface MiniBarsProps {
  bars: { label: string; v: number }[]
  formatValue?: (v: number) => string
  /** Accessible summary. */
  label: string
}

const W = 320
const H = 80
const PAD_B = 14
const PAD_T = 12

export function MiniBars({ bars, formatValue = (v) => String(Math.round(v)), label }: MiniBarsProps) {
  const good = bars.filter((b) => Number.isFinite(b.v) && b.v >= 0)
  if (good.length === 0) return <div className="mini-bars mini-bars--empty" role="img" aria-label={label} />
  // Bars start at a floor below the minimum so small differences in e.g. SpO2 95..99 stay visible.
  const hi = Math.max(...good.map((b) => b.v))
  const lo = Math.min(...good.map((b) => b.v))
  const floor = lo === hi ? 0 : Math.max(0, lo - (hi - lo) * 0.6)
  const slot = W / bars.length
  const bw = Math.max(2, slot * 0.64)
  const labelEvery = Math.ceil(bars.length / 6)
  const f = (n: number) => +n.toFixed(1)
  return (
    <div className="mini-bars">
      <svg className="mini-bars__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
        <title>{label}</title>
        {bars.map((b, i) => {
          if (!Number.isFinite(b.v) || b.v < 0) return null
          const h = Math.max(2, ((b.v - floor) / (hi - floor || 1)) * (H - PAD_B - PAD_T))
          const x = i * slot + (slot - bw) / 2
          return <rect key={i} className="mini-bars__bar" x={f(x)} y={f(H - PAD_B - h)} width={f(bw)} height={f(h)} rx="2" />
        })}
        {bars.map((b, i) =>
          i % labelEvery === 0 ? (
            <text key={i} className="mini-bars__lbl" x={f(i * slot + slot / 2)} y={H - 2} textAnchor="middle">
              {b.label}
            </text>
          ) : null,
        )}
        <text className="mini-bars__lbl mini-bars__lbl--max" x="0" y="8">
          {formatValue(hi)}
        </text>
      </svg>
    </div>
  )
}
