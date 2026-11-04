import { describe, expect, it } from 'vitest'
import { ageOn, initials, normalizeNick, validateProfile } from './profile'

const TODAY = '2026-11-04'
const v = (o: Record<string, string>) => validateProfile({ name: 'Анна', ...o }, TODAY)

describe('normalizeNick', () => {
  it('strips one leading @ and whitespace', () => {
    expect(normalizeNick('  @anna ')).toBe('anna')
    expect(normalizeNick('anna')).toBe('anna')
    expect(normalizeNick('@@a')).toBe('@a')
  })
})

describe('validateProfile', () => {
  it('only name is required', () => {
    expect(validateProfile({ name: 'A' }, TODAY)).toEqual({})
    expect(validateProfile({ name: '   ' }, TODAY).name?.key).toBe('profileError.nameRequired')
  })
  it('name length 40/41', () => {
    expect(v({ name: 'я'.repeat(40) }).name).toBeUndefined()
    expect(v({ name: 'я'.repeat(41) }).name).toEqual({ key: 'profileError.nameTooLong', params: { max: 40 } })
    expect(v({ name: ` ${'a'.repeat(40)} ` }).name).toBeUndefined()
  })
  it('nick 2/3/20/21, charset, @ prefix, empty ok', () => {
    expect(v({ nick: 'ab' }).nick?.key).toBe('profileError.nickInvalid')
    expect(v({ nick: 'abc' }).nick).toBeUndefined()
    expect(v({ nick: 'a'.repeat(20) }).nick).toBeUndefined()
    expect(v({ nick: 'a'.repeat(21) }).nick?.key).toBe('profileError.nickInvalid')
    expect(v({ nick: '@abc_9' }).nick).toBeUndefined()
    expect(v({ nick: 'аня' }).nick?.key).toBe('profileError.nickInvalid')
    expect(v({ nick: 'a b c' }).nick?.key).toBe('profileError.nickInvalid')
    expect(v({ nick: '' }).nick).toBeUndefined()
    expect(v({ nick: '@' }).nick).toBeUndefined()
  })
  it('email forms', () => {
    for (const ok of ['a@b.co', 'a.b+c@d.example.com', ' a@b.io ', '']) expect(v({ email: ok }).email).toBeUndefined()
    for (const bad of ['a', 'a@b', 'a@b.c', '@b.com', 'a@@b.com', 'a b@c.com', 'a@b .com']) {
      expect(v({ email: bad }).email?.key).toBe('profileError.emailInvalid')
    }
  })
  it('birth: today ok, tomorrow future, 120 ok (even on eve of 121st birthday), 121 too old, malformed', () => {
    expect(v({ birth: TODAY }).birth).toBeUndefined()
    expect(v({ birth: '2026-11-05' }).birth?.key).toBe('profileError.birthFuture')
    expect(v({ birth: '1906-11-03' }).birth).toBeUndefined()
    expect(v({ birth: '1905-11-05' }).birth).toBeUndefined()
    expect(v({ birth: '1905-11-04' }).birth).toEqual({ key: 'profileError.birthYear', params: { max: 120 } })
    expect(v({ birth: '2020-02-30' }).birth?.key).toBe('profileError.birthInvalid')
    expect(v({ birth: 'abc' }).birth?.key).toBe('profileError.birthInvalid')
    expect(v({ birth: '' }).birth).toBeUndefined()
  })
})

describe('ageOn', () => {
  it('birthday today counts, day before does not', () => {
    expect(ageOn('2000-11-04', '2026-11-04')).toBe(26)
    expect(ageOn('2000-11-05', '2026-11-04')).toBe(25)
    expect(ageOn('2000-11-03', '2026-11-04')).toBe(26)
  })
  it('newborn is 0', () => expect(ageOn('2026-11-04', '2026-11-04')).toBe(0))
  it('Feb 29 birthday', () => {
    expect(ageOn('2000-02-29', '2025-02-28')).toBe(24)
    expect(ageOn('2000-02-29', '2025-03-01')).toBe(25)
    expect(ageOn('2000-02-29', '2024-02-29')).toBe(24)
    expect(ageOn('2000-02-29', '2024-02-28')).toBe(23)
  })
})

describe('initials', () => {
  it('two words, Cyrillic, extra spaces', () => {
    expect(initials('  анна   мария  ')).toBe('АМ')
    expect(initials('Anna Maria Louise')).toBe('AM')
  })
  it('one word', () => expect(initials('Анна')).toBe('А'))
  it('empty and emoji fall back', () => {
    expect(initials('')).toBe('?')
    expect(initials('   ')).toBe('?')
    expect(initials('😀')).toBe('?')
    expect(initials('😀 bob')).toBe('B')
  })
})
