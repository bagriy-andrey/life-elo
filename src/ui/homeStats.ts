import type { LedgerEntry } from '../engine/rating'

export type HomeRange = 'ten' | 'all'

export const TEN_DAYS = 10

export interface PeriodStats {
  /** Rating change over the range (start = ratingBefore of the first shown day for "ten", 0 for "all"). */
  change: number
  /** Absolute ledger indexes (ties keep the earliest day); -1 when the ledger is empty. */
  iMin: number
  iMax: number
  iBest: number
  iWorst: number
  /** Consecutive days with delta > 0 ending at the last ledger day (whole history). */
  streakNow: number
  /** Longest plus-day run within the range, and the absolute index of its last day (-1 if none). */
  streakRecord: number
  streakRecordEnd: number
}

/** Index of the first shown day. */
export function rangeStart(len: number, range: HomeRange): number {
  return range === 'ten' ? Math.max(0, len - TEN_DAYS) : 0
}

export function periodStats(ledger: LedgerEntry[], range: HomeRange): PeriodStats {
  const from = rangeStart(ledger.length, range)
  const stats: PeriodStats = {
    change: 0, iMin: -1, iMax: -1, iBest: -1, iWorst: -1,
    streakNow: 0, streakRecord: 0, streakRecordEnd: -1,
  }
  if (ledger.length === 0) return stats

  stats.change = ledger.at(-1)!.ratingAfter - (range === 'ten' ? ledger[from].ratingBefore : 0)

  for (let i = ledger.length - 1; i >= 0 && ledger[i].delta > 0; i--) stats.streakNow++

  stats.iMin = stats.iMax = stats.iBest = stats.iWorst = from
  let run = 0
  for (let i = from; i < ledger.length; i++) {
    const e = ledger[i]
    if (e.ratingAfter < ledger[stats.iMin].ratingAfter) stats.iMin = i
    if (e.ratingAfter > ledger[stats.iMax].ratingAfter) stats.iMax = i
    if (e.delta > ledger[stats.iBest].delta) stats.iBest = i
    if (e.delta < ledger[stats.iWorst].delta) stats.iWorst = i
    run = e.delta > 0 ? run + 1 : 0
    if (run > stats.streakRecord) {
      stats.streakRecord = run
      stats.streakRecordEnd = i
    }
  }
  return stats
}

/** Smooth cubic-bezier path through the points (horizontal tangents at every point). */
export function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return ''
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]
    const [x1, y1] = points[i]
    const mx = (x1 - x0) / 2
    d += ` C${x0 + mx},${y0} ${x1 - mx},${y1} ${x1},${y1}`
  }
  return d
}

export const CHART_HEIGHT = 190
export const CHART_PAD_TOP = 54
export const CHART_PAD_BOTTOM = 14

export interface ChartGeometry {
  step: number
  innerW: number
  height: number
  /** One point per shown day (x = column centre). */
  points: [number, number][]
  zeroY: number
  /** Y of the dashed grid lines. */
  grid: number[]
  /** Index of the first shown day in the ledger. */
  offset: number
}

export function chartGeometry(ledger: LedgerEntry[], range: HomeRange, viewportWidth: number): ChartGeometry {
  const offset = rangeStart(ledger.length, range)
  const view = ledger.slice(offset)
  const step = Math.max(28, viewportWidth / 10)
  const plotH = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM
  const vals = view.map((e) => e.ratingAfter)
  let lo = Math.min(...vals, 0)
  let hi = Math.max(...vals, 0)
  const pad = (hi - lo) * 0.06 || 1
  lo -= pad
  hi += pad
  const y = (v: number) => CHART_PAD_TOP + ((hi - v) / (hi - lo)) * plotH
  return {
    step,
    innerW: Math.round(step * view.length),
    height: CHART_HEIGHT,
    points: view.map((e, i) => [step * i + step / 2, Math.round(y(e.ratingAfter) * 10) / 10]),
    zeroY: y(0),
    grid: [0.25, 0.5, 0.75].map((f) => CHART_PAD_TOP + f * plotH),
    offset,
  }
}
