import { useState } from 'react'
import type { Profile as ProfileData } from '../domain/profile'
import { toDayKey } from '../domain/day'
import { useI18n } from '../i18n'
import { Avatar, Button, Card } from './components'
import { cx } from './components/cx'
import { formatBirth, formatSigned } from './labels'
import './Profile.css'

interface Props {
  profile?: ProfileData
  rating: number
  onEdit: () => void
}

export function Profile({ profile, rating, onEdit }: Props) {
  const { t, locale } = useI18n()
  const [today] = useState(() => toDayKey(new Date()))
  if (!profile) {
    // Temporary until the edit mode (plan 04 step 15) takes over.
    return (
      <section className="stack">
        <h2>{t('tab.profile')}</h2>
        <p className="muted">{t('profile.empty')}</p>
      </section>
    )
  }
  const sign = rating > 0 ? 'pos' : rating < 0 ? 'neg' : 'zero'
  const since = new Date(profile.createdAt).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return (
    <section className="stack">
      <div className="profile-head">
        <h2>{t('tab.profile')}</h2>
        <Button onClick={onEdit}>{t('profile.edit')}</Button>
      </div>
      <div className="profile-id">
        <Avatar src={profile.photo} name={profile.name} size={96} />
        <strong className="profile-name">{profile.name}</strong>
        {profile.nick && <span className="muted">@{profile.nick}</span>}
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
      <Card className="profile-rows">
        <div className="profile-row">
          <span className="muted">{t('profile.email')}</span>
          <span className="profile-row-value">{profile.email || '—'}</span>
        </div>
        <div className="profile-row">
          <span className="muted">{t('profile.birth')}</span>
          <span className="profile-row-value">
            {profile.birth ? formatBirth(profile.birth, today, t, locale) : '—'}
          </span>
        </div>
      </Card>
    </section>
  )
}
