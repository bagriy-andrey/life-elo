import type { GarminEvidence } from '../../domain/garminPrefill'
import { useI18n } from '../../i18n'
import { renderBold, useEvidenceText } from './evidenceText'
import './GarminHint.css'

/** «● Garmin: 11 711 шагов» hint row under a habit name. */
export function GarminHint({ evidence, className = '' }: { evidence: GarminEvidence; className?: string }) {
  const { t } = useI18n()
  const text = useEvidenceText()
  return (
    <p className={`garmin-hint ${className}`.trim()}>
      <span className="garmin-hint-dot" aria-hidden="true" />
      <span>{renderBold(t('garmin.review.hint', { evidence: text(evidence) }))}</span>
    </p>
  )
}
