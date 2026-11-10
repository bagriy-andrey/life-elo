// Pure helpers for the habit-page line chart: smooth path through runs of points and pointer → nearest point.

export type Pt = [number, number]

/**
 * Smooth path through each run of consecutive points (`null` breaks the line). Monotone cubic (Fritsch–Carlson):
 * the curve never overshoots a point, so a value never looks earlier/later than it was.
 */
export function smoothRuns(points: (Pt | null)[]): string {
  const runs: Pt[][] = [[]]
  for (const p of points) {
    if (p) runs[runs.length - 1].push(p)
    else if (runs[runs.length - 1].length) runs.push([])
  }
  return runs.filter((r) => r.length).map(monotone).join('')
}

function monotone(pts: Pt[]): string {
  const f = (n: number) => +n.toFixed(2)
  if (pts.length === 1) return `M${f(pts[0][0])} ${f(pts[0][1])}`
  const n = pts.length
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) d.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]))
  const m: number[] = [d[0]]
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2)
  m.push(d[n - 2])
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const t = 3 / Math.sqrt(s)
      m[i] = t * a * d[i]
      m[i + 1] = t * b * d[i]
    }
  }
  let path = `M${f(pts[0][0])} ${f(pts[0][1])}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[i + 1]
    const h = (x1 - x0) / 3
    path += `C${f(x0 + h)} ${f(y0 + m[i] * h)} ${f(x1 - h)} ${f(y1 - m[i + 1] * h)} ${f(x1)} ${f(y1)}`
  }
  return path
}

/** Index of the point with data closest to `fraction` (0..1 across the plot); `null` when there is none. */
export function nearestIndex(hasData: boolean[], fraction: number): number | null {
  const n = hasData.length
  if (n === 0) return null
  const target = Math.min(n - 1, Math.max(0, Math.round(fraction * n - 0.5)))
  let best: number | null = null
  for (let i = 0; i < n; i++) {
    if (hasData[i] && (best === null || Math.abs(i - target) < Math.abs(best - target))) best = i
  }
  return best
}
