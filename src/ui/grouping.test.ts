import { describe, expect, it } from 'vitest'
import { countByDirectionAndTier, groupByDirectionAndTier } from './grouping'
import type { HabitDirection, ImpactTier } from '../domain/types'

type Item = { id: string; direction: HabitDirection; tier: ImpactTier }
const it_ = (id: string, direction: HabitDirection, tier: ImpactTier): Item => ({ id, direction, tier })

describe('groupByDirectionAndTier', () => {
  it('orders constructive before destructive and strong → medium → weak', () => {
    const items = [
      it_('a', 'destructive', 'weak'),
      it_('b', 'constructive', 'weak'),
      it_('c', 'destructive', 'strong'),
      it_('d', 'constructive', 'strong'),
      it_('e', 'constructive', 'medium'),
    ]
    const out = groupByDirectionAndTier(items, (x) => x)
    expect(out.map((g) => [g.direction, g.tiers.map((t) => [t.tier, t.items.map((i) => i.id)])])).toEqual([
      ['constructive', [['strong', ['d']], ['medium', ['e']], ['weak', ['b']]]],
      ['destructive', [['strong', ['c']], ['weak', ['a']]]],
    ])
  })

  it('drops empty groups', () => {
    expect(groupByDirectionAndTier([], (x: Item) => x)).toEqual([])
    const out = groupByDirectionAndTier([it_('a', 'destructive', 'medium')], (x) => x)
    expect(out).toHaveLength(1)
    expect(out[0].tiers).toHaveLength(1)
  })

  it('keeps relative order within a group', () => {
    const items = ['x', 'y', 'z'].map((id) => it_(id, 'constructive', 'medium'))
    const out = groupByDirectionAndTier(items, (x) => x)
    expect(out[0].tiers[0].items.map((i) => i.id)).toEqual(['x', 'y', 'z'])
  })
})

describe('countByDirectionAndTier', () => {
  const zero = { total: 0, strong: 0, medium: 0, weak: 0 }

  it('returns both directions with zeros for an empty list', () => {
    expect(countByDirectionAndTier([], (x: Item) => x)).toEqual({ constructive: zero, destructive: zero })
  })

  it('counts a mix of directions and tiers', () => {
    const items = [
      it_('a', 'constructive', 'strong'),
      it_('b', 'constructive', 'weak'),
      it_('c', 'constructive', 'weak'),
      it_('d', 'destructive', 'medium'),
    ]
    expect(countByDirectionAndTier(items, (x) => x)).toEqual({
      constructive: { total: 3, strong: 1, medium: 0, weak: 2 },
      destructive: { total: 1, strong: 0, medium: 1, weak: 0 },
    })
  })

  it('counts paused items like active ones', () => {
    const items = [
      { ...it_('a', 'constructive', 'medium'), active: true },
      { ...it_('b', 'constructive', 'medium'), active: false },
    ]
    expect(countByDirectionAndTier(items, (x) => x).constructive).toEqual({ ...zero, total: 2, medium: 2 })
  })
})
