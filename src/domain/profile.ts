import type { DayKey } from './types'

export interface Profile {
  id: 'me'
  name: string
  nick?: string
  email?: string
  /** 'YYYY-MM-DD' */
  birth?: DayKey
  /** data URL of the resized photo */
  photo?: string
  createdAt: number
}

/** Raw form input; all fields are text as typed. */
export interface ProfileInput {
  name: string
  nick?: string
  email?: string
  birth?: string
}

export type ProfileErrorKey =
  | 'profileError.nameRequired'
  | 'profileError.nameTooLong'
  | 'profileError.nickInvalid'
  | 'profileError.emailInvalid'
  | 'profileError.birthInvalid'
  | 'profileError.birthFuture'
  | 'profileError.birthYear'

export interface ProfileError {
  key: ProfileErrorKey
  params?: Record<string, string | number>
}

export type ProfileErrors = Partial<Record<'name' | 'nick' | 'email' | 'birth', ProfileError>>

export const NAME_MAX = 40
export const MAX_AGE = 120
const NICK_RE = /^[A-Za-z0-9_]{3,20}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** Trims and drops one leading "@": "  @anna " -> "anna". */
export function normalizeNick(raw: string): string {
  const t = raw.trim()
  return (t.startsWith('@') ? t.slice(1) : t).trim()
}

function validDay(s: string): boolean {
  const m = DAY_RE.exec(s)
  if (!m) return false
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const dim = new Date(Date.UTC(y, mo, 0)).getUTCDate()
  return mo >= 1 && mo <= 12 && d >= 1 && d <= dim
}

/**
 * Whole years between `birth` and `today` (both 'YYYY-MM-DD'). Pure string/number
 * arithmetic, so no timezone is involved. A Feb 29 birthday is reached on Mar 1 in non-leap years.
 */
export function ageOn(birth: DayKey, today: DayKey): number {
  const years = Number(today.slice(0, 4)) - Number(birth.slice(0, 4))
  return today.slice(5) < birth.slice(5) ? years - 1 : years
}

export function validateProfile(input: ProfileInput, today: DayKey): ProfileErrors {
  const errors: ProfileErrors = {}
  const name = input.name.trim()
  if (!name) errors.name = { key: 'profileError.nameRequired' }
  else if ([...name].length > NAME_MAX) {
    errors.name = { key: 'profileError.nameTooLong', params: { max: NAME_MAX } }
  }

  const nick = normalizeNick(input.nick ?? '')
  if (nick && !NICK_RE.test(nick)) errors.nick = { key: 'profileError.nickInvalid' }

  const email = (input.email ?? '').trim()
  if (email && !EMAIL_RE.test(email)) errors.email = { key: 'profileError.emailInvalid' }

  const birth = (input.birth ?? '').trim()
  if (birth) {
    if (!validDay(birth)) errors.birth = { key: 'profileError.birthInvalid' }
    else if (birth > today) errors.birth = { key: 'profileError.birthFuture' }
    else if (ageOn(birth, today) > MAX_AGE) {
      errors.birth = { key: 'profileError.birthYear', params: { max: MAX_AGE } }
    }
  }
  return errors
}

/** First letters of up to two words, uppercased; '?' when there is no letter or digit to show. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words
    .map((w) => [...w].find((c) => /[\p{L}\p{N}]/u.test(c)))
    .filter((c): c is string => c !== undefined)
    .slice(0, 2)
  return letters.length ? letters.join('').toLocaleUpperCase() : '?'
}
