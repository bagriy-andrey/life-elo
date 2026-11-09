import type { HabitDirection, ImpactTier } from '../domain/types'

export interface DirectionGroup<T> {
  direction: HabitDirection
  tiers: { tier: ImpactTier; items: T[] }[]
}

const DIRECTIONS: HabitDirection[] = ['constructive', 'destructive']
const TIERS: ImpactTier[] = ['strong', 'medium', 'weak']

/** Groups by direction (constructive first), then tier (strong → weak). Stable; empty groups dropped. */
export function groupByDirectionAndTier<T>(
  items: T[],
  meta: (item: T) => { direction: HabitDirection; tier: ImpactTier },
): DirectionGroup<T>[] {
  const metas = items.map((item) => ({ item, ...meta(item) }))
  return DIRECTIONS.map((direction) => ({
    direction,
    tiers: TIERS.map((tier) => ({
      tier,
      items: metas.filter((m) => m.direction === direction && m.tier === tier).map((m) => m.item),
    })).filter((t) => t.items.length > 0),
  })).filter((g) => g.tiers.length > 0)
}

export interface DirectionCounts {
  total: number
  strong: number
  medium: number
  weak: number
}

/** Counts items per direction and tier. Always returns both directions, zeros included. */
export function countByDirectionAndTier<T>(
  items: T[],
  meta: (item: T) => { direction: HabitDirection; tier: ImpactTier },
): Record<HabitDirection, DirectionCounts> {
  const out: Record<HabitDirection, DirectionCounts> = {
    constructive: { total: 0, strong: 0, medium: 0, weak: 0 },
    destructive: { total: 0, strong: 0, medium: 0, weak: 0 },
  }
  for (const item of items) {
    const { direction, tier } = meta(item)
    out[direction].total += 1
    out[direction][tier] += 1
  }
  return out
}
