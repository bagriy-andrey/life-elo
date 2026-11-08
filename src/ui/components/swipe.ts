export type SwipeDirection = 'good' | 'bad'

/** Drag distance (px) after which a release commits the answer. */
export const SWIPE_THRESHOLD = 90
/** Release speed (px/ms) that commits a short drag (a fling). */
export const SWIPE_FLING_VELOCITY = 0.6
/** Minimal drag (px) for a fling to count, so a tap-jitter never answers. */
export const SWIPE_FLING_MIN_DISTANCE = 24

/**
 * Decides what a pointer release means. dx > 0 (right) = good, dx < 0 (left) = bad;
 * null = snap back. width is the card width: on very narrow cards the threshold
 * shrinks to 40% of it. velocity is signed px/ms at release.
 */
export function swipeDecision(dx: number, velocity: number, width: number): SwipeDirection | null {
  const threshold = Math.min(SWIPE_THRESHOLD, Math.max(1, width * 0.4))
  const dir: SwipeDirection = dx > 0 ? 'good' : 'bad'
  if (Math.abs(dx) >= threshold) return dir
  const flingSameWay = dx > 0 ? velocity >= SWIPE_FLING_VELOCITY : -velocity >= SWIPE_FLING_VELOCITY
  if (Math.abs(dx) >= SWIPE_FLING_MIN_DISTANCE && flingSameWay) return dir
  return null
}
