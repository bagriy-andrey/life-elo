import type { ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { formatSigned } from '../labels'
import { cx } from './cx'
import { Pill } from './Pill'
import './Card.css'
import './EloScore.css'

interface Props {
  rating: number
  caption: ReactNode
  /** Clean-day streak; hidden when 0. */
  streak?: number
}

export function EloScore({ rating, caption, streak = 0 }: Props) {
  const { t } = useI18n()
  const sign = rating > 0 ? 'pos' : rating < 0 ? 'neg' : 'zero'
  return (
    <div className="elo card">
      <span className="muted">Life Elo</span>
      <strong className={cx('elo-value', sign)}>{formatSigned(rating, 1)}</strong>
      <span className="muted">{caption}</span>
      {streak > 0 && <Pill>{t('elo.streak', { count: streak })}</Pill>}
    </div>
  )
}
