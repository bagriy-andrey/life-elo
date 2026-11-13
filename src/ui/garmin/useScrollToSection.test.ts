import { describe, expect, it, vi } from 'vitest'
import { scrollToSection, sectionIdFromHash } from './useScrollToSection'

describe('sectionIdFromHash', () => {
  it('accepts known sections with or without #', () => {
    for (const s of ['sleep', 'recovery', 'activity', 'stress', 'breath']) {
      expect(sectionIdFromHash(`#${s}`)).toBe(s)
      expect(sectionIdFromHash(s)).toBe(s)
    }
  })
  it('ignores unknown or empty hashes', () => {
    expect(sectionIdFromHash('')).toBeUndefined()
    expect(sectionIdFromHash('#')).toBeUndefined()
    expect(sectionIdFromHash('#nope')).toBeUndefined()
    expect(sectionIdFromHash('#Sleep')).toBeUndefined()
  })
})

describe('scrollToSection', () => {
  it('scrolls a known section and ignores unknown ids', () => {
    const spy = vi.fn()
    const els: Record<string, { scrollIntoView: () => void }> = { stress: { scrollIntoView: spy }, other: { scrollIntoView: spy } }
    const find = (id: string) => els[id] ?? null
    expect(scrollToSection('other', find)).toBe(false)
    expect(scrollToSection(undefined, find)).toBe(false)
    expect(scrollToSection('sleep', find)).toBe(false)
    expect(spy).not.toHaveBeenCalled()
    expect(scrollToSection('stress', find)).toBe(true)
    expect(spy).toHaveBeenCalledTimes(1)
  })
})
