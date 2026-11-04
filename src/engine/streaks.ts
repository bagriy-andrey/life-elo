import type { Zone } from '../domain/types'
import type { RulesetConfig } from './config'

/** Per-habit streak counters. `neg` counts consecutive bad days. */
export interface StreakState {
  pos: number
  neg: number
}

export const EMPTY_STREAK: StreakState = { pos: 0, neg: 0 }

type StreakCfg = Pick<RulesetConfig, 'softDecayFactor' | 'recoveryMinBadDays' | 'negativeMultipliers'>

/**
 * Streak after a scored day in `zone` (LIFE_ELO_PRODUCT_CONTEXT.md §6.5):
 * excellent/ok: pos +1; tolerable: pos halved (floor), neg reset; bad: neg +1, pos reset to 0.
 * excellent/ok also end a bad run (neg = 0), so "consecutive bad days" stays consecutive.
 */
export function advanceStreak(state: StreakState, zone: Zone, cfg: StreakCfg): StreakState {
  switch (zone) {
    case 'excellent':
    case 'ok':
      return { pos: state.pos + 1, neg: 0 }
    case 'tolerable':
      return { pos: Math.floor(state.pos * cfg.softDecayFactor), neg: 0 }
    case 'bad':
      return { pos: 0, neg: state.neg + 1 }
  }
}

/** Unknown habit (or whole unknown day): the streak breaks. N/A needs no call: the streak is paused. */
export function breakStreak(): StreakState {
  return { ...EMPTY_STREAK }
}

/** Multiplier for a bad day; `negStreak` is the count INCLUDING that day (1st bad day = 1). */
export function negativeMultiplier(negStreak: number, cfg: Pick<RulesetConfig, 'negativeMultipliers'>): number {
  const m = cfg.negativeMultipliers
  const i = Math.min(Math.max(negStreak, 1), m.length) - 1
  return m[i]
}

/** True when the streak BEFORE today has >= recoveryMinBadDays consecutive bad days. */
export function isRecovery(stateBefore: StreakState, cfg: Pick<RulesetConfig, 'recoveryMinBadDays'>): boolean {
  return stateBefore.neg >= cfg.recoveryMinBadDays
}
