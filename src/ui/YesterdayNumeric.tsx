import { useState, type FormEvent } from 'react'
import { MAX_BY_UNIT, parseNumeric, parseTime, stepFor, type NumericUnit, type ParseError } from '../domain/reviewFlow'
import { useI18n } from '../i18n'
import { Button, Field } from './components'

interface Props {
  /** `time` shows an HH:MM input, the rest an integer stepper. */
  unit: NumericUnit | 'time'
  title: string
  typeLabel: string
  question: string
  /** Ready goal text ("Цель: 8 000 шагов"), if the habit has a measured rule. */
  goal?: string
  /** Previously given answer (kept across back/forward and summary edits). */
  initial?: number | string
  onConfirm: (value: number | string) => void
  onNotApplicable: () => void
}

/** Numeric (integer + stepper) or time (HH:MM) answer card of the yesterday review. */
export function YesterdayNumeric({ unit, title, typeLabel, question, goal, initial, onConfirm, onNotApplicable }: Props) {
  const { t, locale } = useI18n()
  const [draft, setDraft] = useState(initial === undefined ? '' : String(initial))
  const isTime = unit === 'time'
  const parsed = isTime ? parseTime(draft) : parseNumeric(draft, unit)
  const errorKey = (e: ParseError) => (e === 'invalid' && isTime ? 'yr.err.time' : (`yr.err.${e}` as const))
  const error =
    !parsed.ok && parsed.error !== 'empty'
      ? t(errorKey(parsed.error), { max: isTime ? '' : MAX_BY_UNIT[unit].toLocaleString(locale) })
      : undefined

  const step = (dir: 1 | -1) => {
    if (isTime) return
    const base = parsed.ok ? (parsed.value as number) : 0
    setDraft(String(Math.max(0, base + dir * stepFor(unit))))
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (parsed.ok) onConfirm(parsed.value)
  }

  const unitText = isTime ? '' : t(`unit.${unit}`, { count: parsed.ok ? Number(parsed.value) : 0 })
  const confirmLabel = !parsed.ok
    ? t('yr.next')
    : isTime
      ? t('yr.confirmTime', { time: String(parsed.value) })
      : t('yr.confirm', { n: String(parsed.value), unit: unitText })

  return (
    <form className="yr-num" onSubmit={submit} noValidate>
      <div className="yr-num-card">
        <span className="yr-num-type">{typeLabel}</span>
        <div className="yr-num-main">
          <strong className="yr-num-title">{title}</strong>
          <span className="yr-num-question">{question}</span>
          {isTime ? (
            <Field label={t('yr.time.label')} error={error}>
              <input
                className="yr-num-input"
                type="text"
                inputMode="numeric"
                placeholder="23:00"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
              />
            </Field>
          ) : (
            <>
              <div className="yr-stepper">
                <button type="button" className="yr-step" aria-label={t('yr.num.less')} onClick={() => step(-1)}>−</button>
                <Field label={t('yr.num.label')} error={error} className="yr-stepper-field">
                  <input
                    className="yr-num-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                </Field>
                <button type="button" className="yr-step" aria-label={t('yr.num.more')} onClick={() => step(1)}>+</button>
              </div>
              <span className="yr-num-unit">{unitText}</span>
            </>
          )}
          {goal && <span className="yr-num-goal">{goal}</span>}
        </div>
        {!isTime && <span className="yr-num-hint">{t('yr.num.hint')}</span>}
      </div>
      <Button variant="primary" type="submit" disabled={!parsed.ok} className="yr-confirm">
        {confirmLabel}
      </Button>
      <div className="yr-na">
        <Button variant="quiet" type="button" onClick={onNotApplicable}>
          {t('yr.notApplicable')}
        </Button>
      </div>
    </form>
  )
}
