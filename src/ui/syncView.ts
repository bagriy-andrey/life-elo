import type { I18n } from '../i18n'
import type { SyncStatus } from '../sync/engine'

export type SyncTone = 'ok' | 'err' | 'busy'

export function formatSynced(at: number, t: I18n['t'], locale: string, now = new Date()): string {
  const d = new Date(at)
  const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
  if (d.toDateString() === now.toDateString()) return t('sync.syncedAt', { time })
  const date = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).replace(/\.$/, '')
  return t('sync.syncedOn', { date, time })
}

export function statusText(s: SyncStatus, t: I18n['t'], locale: string): string {
  switch (s.kind) {
    case 'syncing':
      return t('sync.syncing')
    case 'offline':
      return t('sync.offline')
    case 'error':
      return t('sync.error')
    case 'update-required':
      return t('sync.updateRequired')
    default:
      return s.lastSyncedAt ? formatSynced(s.lastSyncedAt, t, locale) : t('sync.never')
  }
}

/** Dot tone + label for the sync row: green synced, red error, grey otherwise. */
export function syncView(
  s: SyncStatus,
  t: I18n['t'],
  locale: string,
): { tone: SyncTone; label: string } {
  let tone: SyncTone = 'busy'
  if (s.kind === 'error' || s.kind === 'update-required') tone = 'err'
  else if (s.kind === 'idle' && s.lastSyncedAt) tone = 'ok'
  return { tone, label: statusText(s, t, locale) }
}
