import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { buildExport, deliverExport, exportLedger, readExportTables } from '../db/exportData'
import { connect, disconnect, pull as garminPull, GARMIN_LIFETIMES, status as garminStatusCall } from '../garmin/api'
import type { GarminErrorReason, GarminLifetime, GarminStatus } from '../garmin/api'
import { cacheFromStatus, loadStatusCache, saveStatusCache } from '../garmin/statusCache'
import { keyExpiry } from '../garmin/ui'
import { saveProfile } from '../db/profile'
import { addDays, reviewDay, toDayKey } from '../domain/day'
import { ageOn, validateProfile } from '../domain/profile'
import type { Profile as ProfileData } from '../domain/profile'
import type { DayKey, DayReview, Habit } from '../domain/types'
import { RULESET_V1 } from '../engine/config'
import { useI18n } from '../i18n'
import type { I18n } from '../i18n'
import { loadPrefs, PREFS_KEY, savePrefs, THEMES } from '../i18n/prefs'
import type { Theme } from '../i18n/prefs'
import { LANGS } from '../i18n/types'
import { APP_VERSION } from '../appVersion'
import { Avatar, BottomSheet, Button, Card, Dialog, Field, Notice, PasswordField, SegmentedControl, Select, Spinner } from './components'
import { cx } from './components/cx'
import { formatClock } from './format'
import { formatBirth, formatSigned } from './labels'
import { resizeImage } from './photo'
import { applyTheme } from './prefs'
import './Profile.css'

interface Props {
  /** `null` = loaded, no profile yet. */
  profile: ProfileData | null
  rating: number
  /** Calendar date (toDayKey), not the review day. */
  today: DayKey
  /** Rows of the Account section (login email, sync). */
  accountSection?: ReactNode
  /** Password + logout buttons, shown under the sections (and alone while there is no profile). */
  accountActions?: ReactNode
  /** App version for the footer. */
  version?: string
  /** Deletes all data (server + device); rejects if it could not. */
  onClearData: () => Promise<void>
  /** Initial Garmin status (test seam); omitted = loaded from the server on mount. */
  garminStatus?: GarminStatus
}

type FieldName = 'name' | 'nick' | 'email' | 'birth'

export function ProfileEdit({ profile, today, onDone, onCancel }: {
  profile: ProfileData | null
  today: DayKey
  onDone: () => void
  onCancel?: () => void
}) {
  const { t } = useI18n()
  const [form, setForm] = useState({
    name: profile?.name ?? '',
    nick: profile?.nick ?? '',
    email: profile?.email ?? '',
    birth: profile?.birth ?? '',
  })
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  const [attempted, setAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [failed, setFailed] = useState(false)
  /** Draft photo: undefined = unchanged, null = removed, string = new data URL. */
  const [photo, setPhoto] = useState<string | null | undefined>(undefined)
  const [photoError, setPhotoError] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const shownPhoto = photo === undefined ? profile?.photo : (photo ?? undefined)
  const pickPhoto = () => fileRef.current?.click()
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.target
    const file = input.files?.[0]
    input.value = '' // allow re-picking the same file
    if (!file) return
    setPhotoError(false)
    setProcessing(true)
    try {
      setPhoto(await resizeImage(file))
    } catch {
      setPhotoError(true)
    } finally {
      setProcessing(false)
    }
  }

  const errors = validateProfile(form, today)
  const errorText = (f: FieldName) => {
    const e = errors[f]
    const show = touched[f] || attempted || (f === 'nick' && form.nick !== '')
    return e && show ? t(e.key, e.params) : undefined
  }
  const set = (f: FieldName, value: string) => setForm((v) => ({ ...v, [f]: value }))
  const blur = (f: FieldName) => () => setTouched((v) => ({ ...v, [f]: true }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (saving || processing) return
    if (Object.keys(errors).length > 0) {
      setAttempted(true)
      return
    }
    setSaving(true)
    setFailed(false)
    try {
      await saveProfile({ ...form, photo }, new Date())
      onDone()
    } catch {
      setFailed(true)
      setSaving(false)
    }
  }

  const birthValid = form.birth !== '' && !errors.birth
  return (
    <form className="stack" onSubmit={submit} noValidate>
      <div className="profile-head">
        <h2>{t('tab.profile')}</h2>
        {onCancel && <Button type="button" onClick={onCancel}>{t('common.cancel')}</Button>}
      </div>
      <div className="profile-id">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
        <Avatar name={form.name} src={shownPhoto} size={88} onClick={pickPhoto} label={t('profile.photoLabel')} disabled={processing} />
        <div className="profile-photo-actions">
          <Button type="button" variant="quiet" onClick={pickPhoto} disabled={processing}>
            {shownPhoto ? t('profile.changePhoto') : t('profile.addPhoto')}
          </Button>
          {shownPhoto && (
            <Button type="button" variant="quiet" onClick={() => setPhoto(null)} disabled={processing}>
              {t('profile.removePhoto')}
            </Button>
          )}
        </div>
        {photoError && <p className="neg" role="alert">{t('profile.photoError')}</p>}
      </div>
      <Card className="profile-form">
        <Field label={t('profile.name')} required error={errorText('name')}>
          <input
            value={form.name}
            placeholder={t('profile.namePlaceholder')}
            autoComplete="name"
            onChange={(e) => set('name', e.target.value)}
            onBlur={blur('name')}
          />
        </Field>
        <Field
          label={t('profile.nick')}
          prefix="@"
          hint={form.nick === '' ? t('profile.nickHint') : undefined}
          error={errorText('nick')}
        >
          <input
            value={form.nick}
            placeholder="nickname"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) => set('nick', e.target.value.replace(/^@+/, ''))}
            onBlur={blur('nick')}
          />
        </Field>
        <Field label={t('profile.email')} error={errorText('email')}>
          <input
            type="email"
            inputMode="email"
            autoCapitalize="none"
            autoComplete="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            onBlur={blur('email')}
          />
        </Field>
        <Field label={t('profile.birth')} error={errorText('birth')}>
          <input
            type="date"
            max={today}
            value={form.birth}
            onChange={(e) => set('birth', e.target.value)}
            onBlur={blur('birth')}
          />
        </Field>
        {form.birth !== '' && (
          <div className="profile-birth-row">
            <span className="muted">{birthValid ? t('profile.age', { count: ageOn(form.birth, today) }) : ''}</span>
            <button type="button" className="profile-birth-clear" onClick={() => set('birth', '')}>
              {t('profile.birthClear')}
            </button>
          </div>
        )}
      </Card>
      {failed && <p className="neg">{t('profile.saveError')}</p>}
      <Button type="submit" variant="primary" className="profile-save" loading={saving} disabled={processing}>
        {t('common.save')}
      </Button>
    </form>
  )
}

const LANG_NAMES = { ru: 'Русский', en: 'English', uk: 'Українська' } as const

function DataSection({ onClear, version }: { onClear: () => Promise<void>; version: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [failed, setFailed] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportState, setExportState] = useState<'idle' | 'done' | 'error'>('idle')
  const close = () => {
    if (clearing) return
    setOpen(false)
    setFailed(false)
  }
  const confirm = async () => {
    if (clearing) return
    setClearing(true)
    setFailed(false)
    try {
      await onClear()
    } catch {
      setFailed(true)
      setClearing(false)
      return
    }
    try {
      localStorage.removeItem(PREFS_KEY)
    } catch {
      /* storage unavailable: nothing to remove */
    }
    location.reload()
  }
  const doExport = async () => {
    if (exporting) return
    setExporting(true)
    setExportState('idle')
    try {
      const now = new Date()
      // One Dexie read: the exported tables and the replay input are the same snapshot.
      const tables = await readExportTables()
      // Same `today` as App/Home replay: the day after the review day.
      const ledger = exportLedger(
        tables.habits as Habit[],
        tables.reviews as DayReview[],
        RULESET_V1,
        addDays(reviewDay(now), 1),
      )
      const json = JSON.stringify(buildExport({ tables, ledger }, now, version), null, 2)
      const result = await deliverExport(json, `life-elo-${toDayKey(now)}.json`)
      setExportState(result === 'shared' ? 'done' : 'idle')
    } catch {
      setExportState('error')
    } finally {
      setExporting(false)
    }
  }
  return (
    <section className="profile-section">
      <h3 className="profile-section-title">{t('settings.data')}</h3>
      <Card className="profile-list">
        <button type="button" className="profile-listrow" onClick={doExport} disabled={exporting}>
          <span>{t('settings.export')}</span>
          <span className="muted profile-export-hint">
            {exportState === 'done' ? t('settings.exportDone') : t('settings.exportHint')}
            {exporting ? <Spinner size={14} /> : ' ›'}
          </span>
        </button>
        <button type="button" className="profile-listrow clear-row" onClick={() => setOpen(true)}>
          <span className="clear-row-text">
            <span className="neg">{t('settings.clear')}</span>
            <span className="muted clear-hint">{t('settings.clearHint')}</span>
          </span>
        </button>
      </Card>
      {exportState === 'error' && <Notice tone="error">{t('settings.exportError')}</Notice>}
      <Dialog open={open} title={t('settings.clearTitle')} onClose={close}>
        <p className="dialog-body">{t('settings.clearBody')}</p>
        {failed && <p className="neg" role="alert">{t('settings.clearError')}</p>}
        <div className="dialog-actions">
          <Button variant="danger" className="clear-btn" onClick={confirm} loading={clearing}>
            {t('common.delete')}
          </Button>
          <Button className="clear-btn" onClick={close} disabled={clearing} autoFocus>
            {t('common.cancel')}
          </Button>
        </div>
      </Dialog>
    </section>
  )
}

const SYNC_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </svg>
)

/** «Синхронизировано в 13:57» / «… вчера в 13:57» (more than 24 h old). */
function formatSyncedLine(iso: string, now: Date, t: I18n['t']): string {
  const at = new Date(iso)
  const key = now.getTime() - at.getTime() > 24 * 3600_000 ? 'garmin.syncedYesterdayAt' : 'garmin.syncedAt'
  return t(key, { time: formatClock(at) })
}

function GarminSection({ initial }: { initial?: GarminStatus }) {
  const { t, locale } = useI18n()
  const [status, setStatus] = useState<GarminStatus | undefined>(initial)
  const [key, setKey] = useState('')
  const [visible, setVisible] = useState(false)
  const [lifetime, setLifetime] = useState<GarminLifetime>(365)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<'connect' | 'invalid' | 'disconnect' | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [now] = useState(() => Date.now())
  const [syncing, setSyncing] = useState(false)
  const [syncReason, setSyncReason] = useState<GarminErrorReason | 'timeout' | 'offline' | null>(null)
  /** Keeps the per-device status cache (read by the day page) in step with fresh answers. */
  const remember = (s: GarminStatus) => {
    const next = cacheFromStatus(s, loadStatusCache())
    if (next) saveStatusCache(next)
  }
  useEffect(() => {
    if (initial) return
    let live = true
    void garminStatusCall().then((s) => {
      remember(s)
      if (live) setStatus(s)
    })
    return () => {
      live = false
    }
  }, [initial])

  const retrying = useRef(false)
  const retryStatus = async () => {
    if (retrying.current) return
    retrying.current = true
    setStatus(undefined)
    const s = await garminStatusCall()
    remember(s)
    setStatus(s)
    retrying.current = false
  }
  const runPull = async () => {
    setSyncing(true)
    setSyncReason(null)
    const to = toDayKey(new Date())
    const r = await garminPull(addDays(to, -6), to, { force: true })
    if (r.kind === 'error') setSyncReason(r.stage)
    else if (r.kind === 'key_invalid' || r.kind === 'timeout' || r.kind === 'offline') setSyncReason(r.kind)
    const s = await garminStatusCall()
    remember(s)
    if (s.kind === 'connected') setStatus((cur) => (cur?.kind === 'connected' ? s : cur))
    setSyncing(false)
  }
  const syncNow = async () => {
    if (syncing) return
    await runPull()
  }

  const doConnect = async () => {
    if (busy || syncing || !key.trim()) return
    setBusy(true)
    setFailed(null)
    setSyncReason(null)
    const r = await connect(key.trim(), lifetime)
    setBusy(false)
    if (r.kind === 'connected') {
      setKey('')
      setVisible(false)
      setStatus({ kind: 'connected', keyExpiresAt: r.keyExpiresAt, lastPullAt: null, lastAttemptAt: null, lastError: null })
      await runPull()
    } else setFailed(r.kind === 'key_invalid' ? 'invalid' : 'connect')
  }
  const doDisconnect = async () => {
    if (busy || syncing) return
    setBusy(true)
    setFailed(null)
    setSyncReason(null)
    const r = await disconnect()
    setBusy(false)
    setConfirmOpen(false)
    if (r === 'ok') setStatus({ kind: 'not_connected' })
    else setFailed('disconnect')
  }

  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
  let body: ReactNode
  if (!status) {
    body = <Spinner size={16} />
  } else if (status.kind === 'error') {
    body = (
      <>
        <p className="muted">{t('garmin.error.status')}</p>
        <Button onClick={retryStatus}>{t('garmin.retry')}</Button>
      </>
    )
  } else if (status.kind === 'connected') {
    const expiry = keyExpiry(status.keyExpiresAt, now)
    const expires = status.keyExpiresAt ? date(status.keyExpiresAt) : ''
    const lastFailed =
      status.lastError !== null &&
      status.lastAttemptAt !== null &&
      (!status.lastPullAt || new Date(status.lastAttemptAt).getTime() > new Date(status.lastPullAt).getTime())
    const when = (iso: string) => new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
    const last = status.lastPullAt
      ? formatSyncedLine(status.lastPullAt, new Date(now), t)
      : t('garmin.neverSynced')
    body = (
      <>
        {expiry === 'expired' ? (
          <>
            <Notice tone="error">
              <strong>{t('garmin.keyInvalid')}</strong> {t('garmin.keyInvalidHint')}
            </Notice>
            <p className="muted">{t('garmin.intro')}</p>
          </>
        ) : (
          <>
            <div className="garmin-status-row">
              <div className="garmin-status-text">
                <span className="garmin-connected">
                  <span className="garmin-dot" aria-hidden="true" />
                  <strong>{t('garmin.connected')}</strong>
                </span>
                <span className="muted garmin-synced">{last}</span>
              </div>
              <button
                type="button"
                className={'garmin-sync-btn'}
                aria-label={t('garmin.syncNow')}
                aria-busy={syncing}
                disabled={busy || syncing}
                onClick={syncNow}
              >
                {syncing ? <Spinner size={18} /> : SYNC_ICON}
              </button>
            </div>
            <p className="muted">{t('garmin.intro')}</p>
            {expires && <span className="muted garmin-expires">{t('garmin.expiresOn', { date: expires })}</span>}
            {expiry === 'soon' && <Notice tone="error">{t('garmin.expiresSoon', { date: expires })}</Notice>}
          </>
        )}
        {lastFailed && status.lastAttemptAt && status.lastError && (
          <span className="garmin-fail">
            {t('garmin.lastAttemptFailed', { time: when(status.lastAttemptAt), reason: t(`garmin.reason.${status.lastError}`) })}
          </span>
        )}
        {syncReason && <span className="garmin-fail">{t('garmin.status.error', { reason: t(`garmin.reason.${syncReason}`) })}</span>}
        {failed === 'disconnect' && <Notice tone="error">{t('garmin.error.disconnect')}</Notice>}
        <Button variant="quiet" className="neg" onClick={() => setConfirmOpen(true)} disabled={busy || syncing}>
          {t('garmin.disconnect')}
        </Button>
        <Dialog open={confirmOpen} title={t('garmin.disconnect')} onClose={() => !busy && setConfirmOpen(false)}>
          <div className="dialog-actions">
            <Button variant="danger" className="clear-btn" onClick={doDisconnect} loading={busy}>
              {t('garmin.disconnect')}
            </Button>
            <Button className="clear-btn" onClick={() => setConfirmOpen(false)} disabled={busy} autoFocus>
              {t('common.cancel')}
            </Button>
          </div>
        </Dialog>
      </>
    )
  } else {
    body = (
      <>
        <PasswordField
          label={t('garmin.keyLabel')}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          visible={visible}
          onToggleVisible={() => setVisible((v) => !v)}
          showLabel={t('password.show')}
          hideLabel={t('password.hide')}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
        />
        <span className="muted">{t('garmin.keyHint')}</span>
        <Select
          label={t('garmin.lifetimeLabel')}
          value={String(lifetime)}
          onChange={(v) => setLifetime(Number(v) as GarminLifetime)}
          options={GARMIN_LIFETIMES.map((d) => ({ value: String(d), label: t(`garmin.lifetime.${d}`) }))}
        />
        {failed === 'invalid' && <Notice tone="error">{t('garmin.keyInvalid')}</Notice>}
        {failed === 'connect' && <Notice tone="error">{t('garmin.error.connect')}</Notice>}
        <Button variant="primary" onClick={doConnect} loading={busy} disabled={!key.trim()}>
          {busy ? t('garmin.connecting') : t('garmin.connect')}
        </Button>
      </>
    )
  }
  return (
    <section className="profile-section">
      <h3 className="profile-section-title">{t('garmin.title')}</h3>
      <Card className="stack">
        {status?.kind !== 'connected' && <p className="muted">{t('garmin.intro')}</p>}
        {body}
      </Card>
    </section>
  )
}

function Settings() {
  const { t, lang, setLang } = useI18n()
  const [sheet, setSheet] = useState(false)
  // localStorage prefs are the single source of truth; this is the only place theme changes.
  const [theme, setThemeState] = useState<Theme>(() => loadPrefs().theme)
  const setTheme = (next: Theme) => {
    setThemeState(next)
    applyTheme(next)
    savePrefs({ theme: next })
  }
  return (
    <section className="profile-section">
      <h3 className="profile-section-title">{t('settings.title')}</h3>
      <Card className="profile-list">
        <button type="button" className="profile-listrow" onClick={() => setSheet(true)}>
          <span>{t('settings.language')}</span>
          <span className="muted">{LANG_NAMES[lang]} ›</span>
        </button>
        <div className="profile-listrow static theme-row">
          <span>{t('settings.theme')}</span>
          <SegmentedControl
            options={THEMES.map((v) => ({ value: v, label: t(`settings.theme.${v}`) }))}
            value={theme}
            onChange={setTheme}
          />
        </div>
      </Card>
      <BottomSheet open={sheet} title={t('settings.languageTitle')} closeLabel={t('habits.close')} onClose={() => setSheet(false)}>
        <div className="sheet-options">
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              className="sheet-option"
              aria-pressed={l === lang}
              onClick={() => {
                setLang(l)
                setSheet(false)
              }}
            >
              {LANG_NAMES[l]}
              {l === lang && <span className="sheet-check">✓</span>}
            </button>
          ))}
        </div>
      </BottomSheet>
    </section>
  )
}

export function Profile({ profile, rating, today, accountSection, accountActions, version = APP_VERSION, onClearData, garminStatus }: Props) {
  const { t, locale } = useI18n()
  const [editing, setEditing] = useState(false)
  if (!profile || editing) {
    return (
      <div className="stack">
        <ProfileEdit
          profile={profile}
          today={today}
          onDone={() => setEditing(false)}
          onCancel={profile ? () => setEditing(false) : undefined}
        />
        {!profile && accountActions}
      </div>
    )
  }
  const sign = rating > 0 ? 'pos' : rating < 0 ? 'neg' : 'zero'
  const since = new Date(profile.createdAt).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return (
    <div className="stack">
      <section className="stack">
        <div className="profile-head">
          <h2>{t('tab.profile')}</h2>
          <Button onClick={() => setEditing(true)}>{t('profile.edit')}</Button>
        </div>
        <div className="profile-id">
          <Avatar src={profile.photo} name={profile.name} size={88} />
          <strong className="profile-name">{profile.name}</strong>
          {profile.nick && <span className="muted">@{profile.nick}</span>}
          {profile.birth && <span className="muted">{formatBirth(profile.birth, today, t, locale)}</span>}
          {profile.email && <span className="muted profile-email">{profile.email}</span>}
        </div>
        <div className="profile-grid">
          <Card className="profile-stat">
            <span className="muted">{t('profile.rating')}</span>
            <strong className={cx('profile-stat-value', sign)}>{formatSigned(rating, 1)}</strong>
          </Card>
          <Card className="profile-stat">
            <span className="muted">{t('profile.since')}</span>
            <strong className="profile-stat-date">{since}</strong>
          </Card>
        </div>
      </section>
      <section className="profile-section">
        <h3 className="profile-section-title">{t('account.title')}</h3>
        {accountSection}
      </section>
      <GarminSection initial={garminStatus} />
      <Settings />
      <DataSection onClear={onClearData} version={version} />
      {accountActions}
      <p className="muted profile-version">{t('app.version', { version })}</p>
    </div>
  )
}
