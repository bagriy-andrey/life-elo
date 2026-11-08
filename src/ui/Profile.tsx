import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { saveProfile } from '../db/profile'
import { ageOn, validateProfile } from '../domain/profile'
import type { Profile as ProfileData } from '../domain/profile'
import type { DayKey } from '../domain/types'
import { useI18n } from '../i18n'
import { loadPrefs, PREFS_KEY, savePrefs, THEMES } from '../i18n/prefs'
import type { Theme } from '../i18n/prefs'
import { LANGS } from '../i18n/types'
import { APP_VERSION } from '../appVersion'
import { Avatar, BottomSheet, Button, Card, Dialog, Field, SegmentedControl } from './components'
import { cx } from './components/cx'
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
        <Button type="button" variant="quiet" onClick={pickPhoto} disabled={processing}>
          {shownPhoto ? t('profile.changePhoto') : t('profile.addPhoto')}
        </Button>
        {shownPhoto && (
          <Button type="button" variant="quiet" onClick={() => setPhoto(null)} disabled={processing}>
            {t('profile.removePhoto')}
          </Button>
        )}
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
      <Button type="submit" variant="primary" className="profile-save" disabled={saving || processing}>
        {t('common.save')}
      </Button>
    </form>
  )
}

const LANG_NAMES = { ru: 'Русский', en: 'English', uk: 'Українська' } as const

function ClearData({ onClear }: { onClear: () => Promise<void> }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [failed, setFailed] = useState(false)
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
  return (
    <div className="clear-data">
      <Button variant="quiet" className="neg clear-btn" onClick={() => setOpen(true)}>
        {t('settings.clear')}
      </Button>
      <span className="muted clear-hint">{t('settings.clearHint')}</span>
      <Dialog open={open} title={t('settings.clearTitle')} onClose={close}>
        <p className="dialog-body">{t('settings.clearBody')}</p>
        {failed && <p className="neg" role="alert">{t('settings.clearError')}</p>}
        <div className="dialog-actions">
          <Button variant="danger" className="clear-btn" onClick={confirm} disabled={clearing}>
            {t('common.delete')}
          </Button>
          <Button className="clear-btn" onClick={close} disabled={clearing} autoFocus>
            {t('common.cancel')}
          </Button>
        </div>
      </Dialog>
    </div>
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
      <BottomSheet open={sheet} title={t('settings.languageTitle')} onClose={() => setSheet(false)}>
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
      </BottomSheet>
    </section>
  )
}

export function Profile({ profile, rating, today, accountSection, accountActions, version = APP_VERSION, onClearData }: Props) {
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
      <Settings />
      <ClearData onClear={onClearData} />
      {accountActions}
      <p className="muted profile-version">{t('app.version', { version })}</p>
    </div>
  )
}
