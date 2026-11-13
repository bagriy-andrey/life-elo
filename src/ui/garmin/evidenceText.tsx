import { Fragment } from 'react'
import type { GarminEvidence } from '../../domain/garminPrefill'
import { useI18n } from '../../i18n'
import type { Key } from '../../i18n/types'
import { humanizeType, NAMED_ACTIVITY_TYPES } from '../../garmin/ui'
import { formatNumber } from '../format'

/** Evidence text with `**bold**` markers (the translation decides which part is emphasised). */
export function useEvidenceText(): (ev: GarminEvidence) => string {
  const { t, locale } = useI18n()
  return (ev) => {
    switch (ev.kind) {
      case 'steps':
        return t('garmin.review.ev.steps', { count: ev.value, n: formatNumber(ev.value, locale) })
      case 'bedtime':
        return t('garmin.review.ev.bedtime', { time: ev.value })
      case 'wake':
        return t('garmin.review.ev.wake', { time: ev.value })
      case 'activity': {
        const named = (NAMED_ACTIVITY_TYPES as readonly string[]).includes(ev.type)
        const label = named ? t(`garmin.type.${ev.type}` as Key) : humanizeType(ev.type)
        return t('garmin.review.ev.activity', { type: label.toLocaleLowerCase(locale), min: formatNumber(ev.minutes, locale) })
      }
    }
  }
}

/** Splits `a **b** c` into nodes with `b` bold. */
export function renderBold(text: string) {
  return text.split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <Fragment key={i}>{part}</Fragment>))
}
