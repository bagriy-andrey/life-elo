export const SCALE_WIDTH = 326
/** Inset of the track on both sides so the dot (r7 + 1.5 ring) is never clipped by the viewBox. */
export const TRACK_PAD = 10
const TRACK_WIDTH = SCALE_WIDTH - 2 * TRACK_PAD
const CHAR_W = 6
const GAP = 6

export const textWidth = (s: string) => s.length * CHAR_W

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** Position of a value on the scale in viewBox units; clamped to the inset track. Degenerate range -> 0. */
export function scaleX(value: number, min: number, max: number): number {
  if (!(max > min)) return 0
  return (clamp(value, min, max) - min) / (max - min) * TRACK_WIDTH + TRACK_PAD
}

/** Corridor rect (x, width) in viewBox units, clamped to the track; null when empty. */
export function corridorRect(low: number, high: number, min: number, max: number): { x: number; width: number } | null {
  const a = scaleX(Math.min(low, high), min, max)
  const b = scaleX(Math.max(low, high), min, max)
  return b > a ? { x: a, width: b - a } : null
}

/**
 * Start x of the corridor label, kept between the end labels and inside the viewBox.
 * Prefers the corridor start (or its end when in the right part). null when it does not fit.
 */
export function corridorLabelX(
  rect: { x: number; width: number },
  label: string,
  lowLabel: string,
  highLabel: string,
): number | null {
  const w = textWidth(label)
  const lo = textWidth(lowLabel) + GAP
  const hi = SCALE_WIDTH - textWidth(highLabel) - GAP
  if (hi - lo < w) return null
  const preferred = rect.x > SCALE_WIDTH * 0.6 ? rect.x + rect.width - w : rect.x
  return clamp(preferred, lo, hi - w)
}
