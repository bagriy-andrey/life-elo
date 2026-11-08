import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Profile as ProfileData } from '../domain/profile'
import type { DayKey } from '../domain/types'
import { I18nProvider } from '../i18n'
import { Profile } from './Profile'

const today = '2026-11-04' as DayKey
const profile = {
  name: 'Анна',
  nick: 'anna',
  email: 'a@b.co',
  birth: '1990-05-01',
  createdAt: Date.UTC(2026, 0, 5),
} as unknown as ProfileData

const render = (p: ProfileData | null, rating = 12.3) =>
  renderToString(
    <I18nProvider>
      <Profile profile={p} rating={rating} today={today} version="0.9.0" onClearData={async () => {}} />
    </I18nProvider>,
  )

describe('Profile smoke render', () => {
  it('renders view mode with settings', () => {
    const html = render(profile)
    expect(html).toContain('Профиль')
    expect(html).toContain('Изменить')
    expect(html.split('Настройки')).toHaveLength(2)
    expect(html).toContain('Аккаунт')
    expect(html).toContain('Язык')
    expect(html).toContain('Тема')
    expect(html).toContain('Очистить все данные')
    expect(html).toContain('Анна')
    expect(html).toContain('версия 0.9.0')
    expect(html).toContain('pos')
    expect(html).not.toContain('role="dialog"')
  })

  it('colors a negative rating', () => {
    expect(render(profile, -3)).toContain('profile-stat-value neg')
  })

  it('renders edit form without profile and without sections', () => {
    const html = render(null)
    expect(html).toContain('Профиль')
    expect(html).not.toContain('Настройки')
  })

  it('renders in English when the stored lang is en', () => {
    const store: Record<string, string> = { 'life-elo:prefs': JSON.stringify({ lang: 'en' }) }
    ;(globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => void (store[k] = v),
    }
    try {
      const html = render(profile)
      expect(html).toContain('Settings')
      expect(html).not.toContain('Настройки')
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage
    }
  })
})
