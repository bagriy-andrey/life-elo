import { useState } from 'react'
import type { PointerEvent } from 'react'
import './LineSeriesChart.css'

const W = 320
const H = 140
const PAD_L = 6
const PAD_R = 6
const PAD_T = 8
const PAD_B = 18
const TICKS = 4

export interface LineSeriesChartProps {
  /** `t` is epoch ms; `v` < 0 or non-finite means "no data" (Garmin uses -1/-2) and breaks the line. */
  points: { t: number; v: number }[]
  /** Shaded reference range (e.g. HRV baseline). */
  band?: { low: number; high: number }
  /** Time axis label for an epoch ms (the caller owns the local-time convention). */
  formatTick: (t: number) => string
  /** Value label for the readout (may include the unit). */
  formatValue?: (v: number) => string
  /** Unitless value label for the y axis; labels are drawn inside the plot box. */
  formatAxis?: (v: number) => string
  /** Accessible summary; also rendered as the SVG <title>. */
  label: string
}

const valid = (v: number) => Number.isFinite(v) && v >= 0

export function LineSeriesChart({ points, band, formatTick, formatValue = (v) => String(Math.round(v)), formatAxis = (v) => String(Math.round(v)), label }: LineSeriesChartProps) {
  const [active, setActive] = useState<number | null>(null)
  const sorted = [...points].filter((p) => Number.isFinite(p.t)).sort((a, b) => a.t - b.t)
  const good = sorted.filter((p) => valid(p.v))
  if (good.length < 2) {
    return <div className="line-series line-series--empty" role="img" aria-label={label} />
  }
  const t0 = sorted[0].t
  const t1 = sorted[sorted.length - 1].t
  const span = Math.max(1, t1 - t0)
  let lo = Math.min(...good.map((p) => p.v))
  let hi = Math.max(...good.map((p) => p.v))
  if (band) {
    lo = Math.min(lo, band.low)
    hi = Math.max(hi, band.high)
  }
  if (hi === lo) {
    lo -= 1
    hi += 1
  }
  const X = (t: number) => PAD_L + ((t - t0) / span) * (W - PAD_L - PAD_R)
  const Y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H - PAD_T - PAD_B)
  const f = (n: number) => +n.toFixed(1)

  let d = ''
  let pen = false
  for (const p of sorted) {
    if (!valid(p.v)) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${f(X(p.t))} ${f(Y(p.v))}`
    pen = true
  }
  const ticks = Array.from({ length: TICKS }, (_, i) => t0 + (span * i) / (TICKS - 1))

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    if (r.width <= 0) return
    const x = ((e.clientX - r.left) / r.width) * W
    const frac = (x - PAD_L) / (W - PAD_L - PAD_R)
    const target = t0 + frac * span
    let best: number | null = null
    sorted.forEach((p, i) => {
      if (valid(p.v) && (best === null || Math.abs(p.t - target) < Math.abs(sorted[best].t - target))) best = i
    })
    setActive(best)
  }
  const hit = active === null ? null : sorted[active]

  return (
    <div className="line-series">
      <div className="line-series__readout" role="status">
        {hit && valid(hit.v) ? (
          <>
            <strong>{formatValue(hit.v)}</strong>
            <span>{formatTick(hit.t)}</span>
          </>
        ) : null}
      </div>
      <div
        className="line-series__plot"
        onPointerMove={(e) => e.pointerType === 'mouse' && pick(e)}
        onPointerDown={pick}
        onPointerLeave={(e) => e.pointerType === 'mouse' && setActive(null)}
      >
        <svg className="line-series__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
          <title>{label}</title>
          {band && (
            <rect
              className="line-series__band"
              x={PAD_L}
              y={f(Y(band.high))}
              width={W - PAD_L - PAD_R}
              height={f(Math.max(0, Y(band.low) - Y(band.high)))}
            />
          )}
          {[lo, hi].map((v) => (
            <line key={v} className="line-series__grid" x1={PAD_L} x2={W - PAD_R} y1={f(Y(v))} y2={f(Y(v))} />
          ))}
          {hit && valid(hit.v) && <line className="line-series__guide" x1={f(X(hit.t))} x2={f(X(hit.t))} y1={PAD_T} y2={H - PAD_B} />}
          <path className="line-series__line" d={d} />
          {hit && valid(hit.v) && <circle className="line-series__dot" cx={f(X(hit.t))} cy={f(Y(hit.v))} r="3.5" />}
          <text className="line-series__lbl" x={PAD_L + 2} y={f(Y(hi)) + 2} textAnchor="start" dominantBaseline="hanging">
            {formatAxis(hi)}
          </text>
          <text className="line-series__lbl" x={PAD_L + 2} y={f(Y(lo)) - 2} textAnchor="start" dominantBaseline="auto">
            {formatAxis(lo)}
          </text>
          {ticks.map((t, i) => (
            <text
              key={i}
              className="line-series__lbl"
              x={f(X(t))}
              y={H - 4}
              textAnchor={i === 0 ? 'start' : i === TICKS - 1 ? 'end' : 'middle'}
            >
              {formatTick(t)}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}
