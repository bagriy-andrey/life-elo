import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Profile as ProfileData } from '../domain/profile'
import type { DayKey } from '../domain/types'
import type { GarminStatus } from '../garmin/api'
import { I18nProvider } from '../i18n'
import { Profile, ProfileEdit } from './Profile'

const today = '2026-11-04' as DayKey
const profile = {
  name: 'Анна',
  nick: 'anna',
  email: 'a@b.co',
  birth: '1990-05-01',
  createdAt: Date.UTC(2026, 0, 5),
} as unknown as ProfileData

const render = (p: ProfileData | null, rating = 12.3, garminStatus?: GarminStatus) =>
  renderToString(
    <I18nProvider>
      <Profile profile={p} rating={rating} today={today} version="0.9.0" onClearData={async () => {}} garminStatus={garminStatus} />
    </I18nProvider>,
  )

describe('Profile smoke render', () => {
  it('renders view mode with settings', () => {
    const html = render(profile)
    expect(html).toContain('Профиль')
    expect(html).toContain('Изменить')
    expect(html.split('Настройки')).toHaveLength(2)
    expect(html).toContain('Данные')
    expect(html).toContain('Экспорт данных')
    expect(html).toContain('JSON')
    expect(html).toContain('Очистить все данные')
    expect(html).toContain('Удалит профиль, привычки, историю и рейтинг везде')
    expect(html).not.toContain('role="alertdialog"')
    expect(html).toContain('Аккаунт')
    expect(html).toContain('Язык')
    expect(html).toContain('Тема')
    expect(html).toContain('Очистить все данные')
    expect(html).toContain('Анна')
    expect(html).toContain('версия 0.9.0')
    expect(html).toContain('pos')
    expect(html).not.toContain('role="alertdialog"')
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

describe('Profile Garmin section', () => {
  it('not connected: key field, lifetime, connect', () => {
    const html = render(profile, 1, { kind: 'not_connected' })
    expect(html).toContain('Ключ Personal API')
    expect(html).toContain('1 год')
    expect(html).toContain('Подключить')
    expect(html).not.toContain('Отключить')
  })

  it('connected: status, expiry, disconnect', () => {
    const at = new Date(Date.now() + 100 * 86_400_000).toISOString()
    const html = render(profile, 1, { kind: 'connected', keyExpiresAt: at, lastPullAt: null, lastAttemptAt: null, lastError: null })
    expect(html).toContain('Подключено')
    expect(html).toContain('Ключ действует до')
    expect(html).toContain('Синхронизации ещё не было')
    expect(html).not.toContain('Последняя синхронизация')
    expect(html).toContain('Отключить')
    expect(html).not.toContain('скоро истечёт')
  })

  it('connected: no data-sheet entry, sync status once, round sync button', () => {
    const at = new Date(Date.now() + 100 * 86_400_000).toISOString()
    const html = render(profile, 1, { kind: 'connected', keyExpiresAt: at, lastPullAt: new Date().toISOString(), lastAttemptAt: null, lastError: null })
    expect(html).not.toContain('Посмотреть данные синхронизации')
    expect(html.match(/Синхронизировано в/g)).toHaveLength(1)
    expect(html).toContain('aria-label="Синхронизировать сейчас"')
    expect(html).toContain('garmin-sync-btn')
    expect(html).toContain('Шаги, сон и тренировки предлагают ответы')
    expect(html).toContain('btn-quiet')
  })

  it('connected with an expired key shows the invalid state', () => {
    const html = render(profile, 1, { kind: 'connected', keyExpiresAt: '2020-01-01T00:00:00Z', lastPullAt: null, lastAttemptAt: null, lastError: null })
    expect(html).toContain('Ключ недействителен')
    expect(html).not.toContain('garmin-sync-btn')
  })

  it('expiring key shows the warning notice', () => {
    const at = new Date(Date.now() + 2 * 86_400_000).toISOString()
    const html = render(profile, 1, { kind: 'connected', keyExpiresAt: at, lastPullAt: null, lastAttemptAt: null, lastError: null })
    expect(html).toContain('скоро истечёт')
  })

  it('status error is neutral text with retry', () => {
    const html = render(profile, 1, { kind: 'error' })
    expect(html).toContain('Не удалось узнать статус Garmin')
    expect(html).toContain('Повторить')
  })

  it('connected with success: last sync and sync-now, no failure line', () => {
    const at = new Date(Date.now() + 100 * 86_400_000).toISOString()
    const html = render(profile, 1, { kind: 'connected', keyExpiresAt: at, lastPullAt: '2026-11-13T08:00:00Z', lastAttemptAt: '2026-11-13T08:00:00Z', lastError: null })
    expect(html).toContain('Синхронизировано')
    expect(html).toContain('Синхронизировать сейчас')
    expect(html).not.toContain('не удалась')
  })

  it('connected with a failed last attempt shows time and reason', () => {
    const at = new Date(Date.now() + 100 * 86_400_000).toISOString()
    const html = render(profile, 1, { kind: 'connected', keyExpiresAt: at, lastPullAt: '2026-11-13T08:00:00Z', lastAttemptAt: '2026-11-13T09:00:00Z', lastError: 'garmin' })
    expect(html).toContain('не удалась')
    expect(html).toContain('Garmin не ответил')
  })
})

describe('ProfileEdit smoke render', () => {
  const edit = (p: ProfileData | null, onCancel?: () => void) =>
    renderToString(
      <I18nProvider>
        <ProfileEdit profile={p} today={today} onDone={() => {}} onCancel={onCancel} />
      </I18nProvider>,
    )

  it('has all fields, birth clear and cancel with a profile', () => {
    const html = edit(profile, () => {})
    expect(html).toContain('Отмена')
    expect(html).toContain('Почта')
    expect(html).toContain('Убрать')
    expect(html).toContain('Сохранить')
    expect(html).toContain('Дата рождения')
  })

  it('has no cancel without a profile', () => {
    const html = edit(null)
    expect(html).not.toContain('Отмена')
    expect(html).not.toContain('Убрать')
    expect(html).toContain('Почта')
  })

  it('first run adds only Выйти via accountActions', () => {
    const html = renderToString(
      <I18nProvider>
        <Profile profile={null} rating={0} today={today} accountActions={<button>Выйти</button>} onClearData={async () => {}} />
      </I18nProvider>,
    )
    expect(html).toContain('Выйти')
    expect(html).not.toContain('Настройки')
  })
})
