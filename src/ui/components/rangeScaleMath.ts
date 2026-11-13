export const SCALE_WIDTH = 326

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

/** Position of a value on the scale in viewBox units; clamped to [0, SCALE_WIDTH]. Degenerate range -> 0. */
export function scaleX(value: number, min: number, max: number): number {
  if (!(max > min)) return 0
  return (clamp(value, min, max) - min) / (max - min) * SCALE_WIDTH
}

/** Corridor rect (x, width) in viewBox units, clamped to the scale; null when empty. */
export function corridorRect(low: number, high: number, min: number, max: number): { x: number; width: number } | null {
  const a = scaleX(Math.min(low, high), min, max)
  const b = scaleX(Math.max(low, high), min, max)
  return b > a ? { x: a, width: b - a } : null
}
