/** Layout constants and pure helpers for WeekChart (viewBox units). */
export const VB_W = 326
export const PLOT_W = 290
export const GUTTER_X = 296
export const DAYS = 7
export const COL_W = PLOT_W / DAYS
export const BAR_W = 20
/** Share of the viewBox width taken by the plot; the day row uses the same fraction. */
export const PLOT_PCT = (PLOT_W / VB_W) * 100

export const STEPS_H = 84
export const STEPS_BASE = 80
const STEPS_TOP = 16
export const SLEEP_H = 112
export const SLEEP_TOP = 8
export const SLEEP_BOTTOM = 104

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)
const finite = (n: number | undefined): n is number => typeof n === 'number' && Number.isFinite(n)
const CHAR_W = 6

export const colCenter = (i: number) => (i + 0.5) * COL_W

/** Max of steps and goal, > 0 (so division never yields NaN). */
export function stepsScale(steps: (number | undefined)[], goal?: number): number {
  const m = Math.max(0, ...steps.filter(finite), finite(goal) ? goal : 0)
  return m > 0 ? m : 1
}

/** y of a steps value (top of the bar / goal line). */
export const stepsY = (v: number, scale: number) => STEPS_BASE - (clamp(v, 0, scale) / scale) * (STEPS_BASE - STEPS_TOP)

/** Bar for a day, null for 0/missing/invalid steps. Tiny values keep a 3px stub. */
export function stepsBar(steps: number | undefined, scale: number): { y: number; height: number } | null {
  if (!finite(steps) || steps <= 0) return null
  const height = Math.max(3, STEPS_BASE - stepsY(steps, scale))
  return { y: STEPS_BASE - height, height }
}

/** y on the sleep axis (22:00 .. 10:00) for a fraction 0..1; clamped. */
export const sleepY = (frac: number) => SLEEP_TOP + clamp(finite(frac) ? frac : 0, 0, 1) * (SLEEP_BOTTOM - SLEEP_TOP)

/** Sleep strip, clamped to the axis; null when empty/invalid. */
export function sleepStrip(s: { startFrac: number; endFrac: number } | undefined): { y: number; height: number } | null {
  if (!s || !finite(s.startFrac) || !finite(s.endFrac)) return null
  const a = sleepY(s.startFrac)
  const b = sleepY(s.endFrac)
  return b > a ? { y: a, height: b - a } : null
}

/** Axis ticks: fraction of 22:00..10:00. */
export const SLEEP_TICKS = [
  { label: '22:00', frac: 0 },
  { label: '00:00', frac: 2 / 12 },
  { label: '06:00', frac: 8 / 12 },
  { label: '10:00', frac: 1 },
] as const

/** x for the goal label: gutter start, shifted left when the text would leave the viewBox. */
export const gutterLabelX = (text: string) => Math.max(0, Math.min(GUTTER_X, VB_W - text.length * CHAR_W))
