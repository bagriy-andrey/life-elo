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
