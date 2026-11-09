import { useState } from 'react'
import { db, newId } from '../db/db'
import { deleteHabit, ReducerInUseError } from '../db/habits'
import { dayOf } from '../domain/day'
import {
  buildQuota,
  buildRule,
  buildWeeklyGoal,
  EMPTY_FORM,
  editedVersions,
  formOf,
  hasAnswers,
  validateReducer,
  type HabitForm,
  type RuleChoice,
  type SetupError,
} from '../domain/habitSetup'
import { settingsOn } from '../domain/settings'
import type { DayReview, Habit, HabitDirection, HabitVersion, ImpactTier } from '../domain/types'
import { useI18n } from '../i18n'
import { BottomSheet, Button, ChipGroup, Dialog, Field, SegmentedControl, Select, Stepper, TypeCards, WeekDots } from './components'
import { ruleChoiceLabels, tierLabels, unitLabels } from './labels'
import './HabitSheet.css'

interface Props {
  /** Habit being edited; omit to create a new one. */
  habit?: Habit
  habits: Habit[]
  /** Stored reviews: decide whether a habit's direction can still change. */
  reviews: DayReview[]
  /** New habits become reviewable starting from this day. */
  effectiveFrom: string
  onClose: () => void
}

const TIER_ORDER: ImpactTier[] = ['weak', 'medium', 'strong']
const TIER_BARS = { weak: 1, medium: 2, strong: 3 } as const
const RULE_CHOICES: RuleChoice[] = ['boolean', 'count', 'minutes', 'steps', 'time']

const weekRange = (direction: HabitDirection) => (direction === 'constructive' ? { min: 1, max: 7, def: 3 } : { min: 0, max: 6, def: 1 })
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

export function HabitSheet({ habit, habits, reviews, effectiveFrom, onClose }: Props) {
  const { t } = useI18n()
  const [day] = useState(() => dayOf(new Date()))
  const editing = habit !== undefined
  const locked = editing && hasAnswers(habit.id, reviews)
  const current = habit ? settingsOn(habit, day) : undefined

  const [name, setName] = useState(habit?.name ?? '')
  const [direction, setDirection] = useState<HabitDirection>(habit?.direction ?? 'constructive')
  const [tier, setTier] = useState<ImpactTier>(current?.tier ?? 'medium')
  const [form, setForm] = useState<HabitForm>(current ? formOf(current) : EMPTY_FORM)
  const [error, setError] = useState<SetupError>()
  const [saving, setSaving] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const set = (patch: Partial<HabitForm>) => setForm((f) => ({ ...f, ...patch }))
  const range = weekRange(direction)
  const weekValue = clamp(Number(form.weeklyTarget) || range.def, range.min, range.max)

  const pickDirection = (next: HabitDirection) => {
    // Resetting `better` is intended: a stored `better` could contradict the new direction (it only changes on habits with no answers).
    setDirection(next)
    const r = weekRange(next)
    // `better` is derived from the direction again; the weekly target must stay in the new range.
    setForm((f) => ({
      ...f,
      better: undefined,
      weeklyTarget: f.period === 'week' ? String(clamp(Number(f.weeklyTarget) || r.def, r.min, r.max)) : f.weeklyTarget,
    }))
  }
  const pickPeriod = (period: 'day' | 'week') =>
    set({ period, weeklyTarget: period === 'week' ? String(weekValue) : form.weeklyTarget })

  const nameOf = (id: string) => habits.find((h) => h.id === id)?.name
  const reducers = habits.filter((h) => h.id !== habit?.id)
  const measured = form.kind !== 'boolean'
  const isTime = form.kind === 'time'
  const units = unitLabels(t, 5)
  const unitHint = measured ? (isTime ? t('habits.timeHint') : units[form.kind as Exclude<RuleChoice, 'boolean' | 'time'>]) : ''
  const errorText = (key: SetupError['key'][]) => (error && key.includes(error.key) ? t(error.key, error.params) : undefined)
  const thresholdKeys: SetupError['key'][] = ['habitError.excellentRequired', 'habitError.badThreshold', 'habitError.thresholdOrder']
  const limitKeys: SetupError['key'][] = [
    'habitError.limitsInteger',
    'habitError.weeklyTarget',
    'habitError.reducerNeedsLimit',
    'habitError.reducerSelf',
    'habitError.reducerMissing',
    'habitError.reducerReduced',
    'habitError.alreadyReducer',
  ]
  const known = ['habitError.nameEmpty', ...thresholdKeys, ...limitKeys] as SetupError['key'][]
  const otherError = error && !known.includes(error.key) ? t(error.key, error.params) : undefined

  const save = async () => {
    if (saving) return
    if (!name.trim()) return setError({ key: 'habitError.nameEmpty' })
    const rule = buildRule(form, direction)
    if (!rule.ok) return setError(rule.error)
    const quota = buildQuota(form, direction)
    if (!quota.ok) return setError(quota.error)
    const weeklyGoal = buildWeeklyGoal(form, direction)
    if (!weeklyGoal.ok) return setError(weeklyGoal.error)
    const reducerError = validateReducer(habit?.id, quota.value, habits, editing ? day : effectiveFrom)
    if (reducerError) return setError(reducerError)
    setSaving(true)
    try {
      if (habit) {
        const versions = editedVersions(
          habit,
          { tier, rule: rule.value, quota: quota.value, weeklyGoal: weeklyGoal.value },
          day,
        )
        await db.habits.update(habit.id, { versions, name: name.trim(), direction: locked ? habit.direction : direction })
      } else {
        const version: HabitVersion = { from: effectiveFrom, tier, rule: rule.value }
        if (quota.value) version.quota = quota.value
        if (weeklyGoal.value) version.weeklyGoal = weeklyGoal.value
        await db.habits.add({
          id: newId(),
          name: name.trim(),
          direction,
          versions: [version],
          active: true,
          effectiveFrom,
          createdAt: Date.now(),
        })
      }
    } catch (e) {
      setSaving(false)
      throw e
    }
    onClose()
  }

  const togglePause = async () => {
    if (!habit) return
    await db.habits.update(habit.id, { active: !habit.active })
    onClose()
  }

  const remove = async () => {
    if (!habit) return
    try {
      await deleteHabit(habit.id)
      onClose()
    } catch (e) {
      if (!(e instanceof ReducerInUseError)) throw e
      const names = e.users.map((u) => `«${u.name}»`).join(', ')
      setError({ key: 'habitError.deleteInUse', params: { names } })
      setConfirmingDelete(false)
    }
  }

  const threshold = (key: 'excellent' | 'ok' | 'tolerable', label: string, placeholder: string, err?: string) => (
    <Field label={label} error={err} className="habit-sheet-threshold">
      <input
        type={isTime ? 'time' : 'number'}
        inputMode={isTime ? undefined : 'decimal'}
        min={isTime ? undefined : 0}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </Field>
  )

  const emptyTolerable =
    direction === 'constructive' ? t('habits.emptyTolerableConstructive') : t('habits.emptyTolerableDestructive')
  const excellentLabel = isTime
    ? t(direction === 'constructive' ? 'habits.targetBy' : 'habits.targetNotLater')
    : t('habits.excellent')
  const ruleLabels = ruleChoiceLabels(t)
  const tiers = tierLabels(t)
  const stepHint =
    direction === 'constructive'
      ? weekValue === 7
        ? t('habits.stepHint.constructiveEvery')
        : t('habits.stepHint.constructive', { count: weekValue })
      : weekValue === 0
        ? t('habits.stepHint.destructiveZero')
        : t('habits.stepHint.destructive', { count: weekValue })
  const normTitle = direction === 'constructive' ? t('habits.normGoal') : t('habits.normLimit')

  return (
    <>
      <BottomSheet
        open
        title={editing ? t('habits.sheetEdit') : t('habits.sheetNew')}
        onClose={onClose}
        closeLabel={t('habits.close')}
        footer={
          <div className="habit-sheet-footer">
            <Button variant="primary" onClick={save} loading={saving}>
              {t('common.save')}
            </Button>
            {editing && (
              <div className="habit-sheet-secondary">
                <Button onClick={togglePause}>{habit.active ? t('habits.pause') : t('habits.resume')}</Button>
                <Button variant="quiet" className="neg" onClick={() => setConfirmingDelete(true)}>
                  {t('common.delete')}
                </Button>
              </div>
            )}
          </div>
        }
      >
        <div className="habit-sheet-form">
          <Field label={t('habits.fieldName')} error={errorText(['habitError.nameEmpty'])}>
            <input
              autoFocus={!editing}
              maxLength={60}
              placeholder={t(
                direction === 'constructive' ? 'habits.namePlaceholderConstructive' : 'habits.namePlaceholderDestructive',
              )}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <div className="habit-sheet-group">
            <span className="habit-sheet-title">{t('habits.fieldType')}</span>
            <TypeCards
              label={t('habits.fieldType')}
              value={direction}
              onChange={pickDirection}
              disabled={locked}
              options={[
                { value: 'constructive', title: t('direction.constructive'), description: t('habits.kindHint.constructive'), tone: 'pos' },
                { value: 'destructive', title: t('direction.destructive'), description: t('habits.kindHint.destructive'), tone: 'neg' },
              ]}
            />
            {locked && <span className="habit-sheet-note">{t('habits.directionLocked')}</span>}
          </div>

          <div className="habit-sheet-group">
            <div className="habit-sheet-titlebar">
              <span className="habit-sheet-title">{t('habits.fieldWeight')}</span>
              <span className="habit-sheet-note">{t(`habits.weightHint.${tier}`)}</span>
            </div>
            <SegmentedControl
              value={tier}
              onChange={setTier}
              options={TIER_ORDER.map((value) => ({ value, label: tiers[value], bars: TIER_BARS[value] }))}
            />
            {editing && <span className="habit-sheet-note">{t('habits.changesFromToday')}</span>}
          </div>

          <div className="habit-sheet-group">
            <span className="habit-sheet-title">{t('habits.fieldMeasure')}</span>
            <ChipGroup
              label={t('habits.fieldMeasure')}
              value={form.kind}
              onChange={(kind) => set({ kind, better: undefined })}
              options={RULE_CHOICES.map((value) => ({ value, label: ruleLabels[value] }))}
            />
          </div>

          <div className="habit-sheet-group">
            <span className="habit-sheet-title">{normTitle}</span>
            {!measured && (
              <SegmentedControl
                value={form.period}
                onChange={pickPeriod}
                options={[
                  { value: 'day', label: t('habits.periodDay') },
                  { value: 'week', label: t('habits.periodWeek') },
                ]}
              />
            )}
            {!measured && form.period === 'week' && (
              <div className="habit-sheet-panel">
                <Stepper
                  value={weekValue}
                  min={range.min}
                  max={range.max}
                  onChange={(n) => set({ weeklyTarget: String(n) })}
                  decLabel={t('habits.stepperDec')}
                  incLabel={t('habits.stepperInc')}
                  label={t(direction === 'constructive' ? 'habits.stepLabel.constructive' : 'habits.stepLabel.destructive')}
                />
                <WeekDots value={weekValue} direction={direction} />
                <span className="habit-sheet-note">
                  {stepHint}
                </span>
                {errorText(['habitError.weeklyTarget']) && <span className="field-error">{errorText(['habitError.weeklyTarget'])}</span>}
              </div>
            )}
            {!measured && form.period === 'day' && (
              <span className="habit-sheet-note">
                {t(direction === 'constructive' ? 'habits.dailyNote.constructive' : 'habits.dailyNote.destructive')}
              </span>
            )}
            {measured && (
              <div className="habit-sheet-panel">
                <span className="habit-sheet-note">{t('habits.thresholdsHint', { unit: unitHint })}</span>
                {threshold('excellent', excellentLabel, t('habits.threshold'), errorText(['habitError.excellentRequired', 'habitError.badThreshold']))}
                {threshold('ok', t('habits.ok'), t('habits.threshold'))}
                {threshold('tolerable', t('habits.tolerable'), emptyTolerable, errorText(['habitError.thresholdOrder']))}
              </div>
            )}
            {form.kind === 'count' && (
              <div className="habit-sheet-panel">
                <span className="habit-sheet-note">{t('habits.limitOptional')}</span>
                <div className="habit-sheet-limits">
                  <Field label={t('habits.perDay')}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.perDay}
                      onChange={(e) => set({ perDay: e.target.value })}
                    />
                  </Field>
                  <Field label={t('habits.perWeek')}>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.perWeek}
                      onChange={(e) => set({ perWeek: e.target.value })}
                    />
                  </Field>
                </div>
                <Select
                  label={t('habits.reducedByAria')}
                  value={form.reducedByDaysOf}
                  onChange={(v) => set({ reducedByDaysOf: v })}
                  options={[
                    { value: '', label: t('habits.notReduced') },
                    ...reducers.map((h) => ({ value: h.id, label: t('habits.reducedBy', { name: nameOf(h.id) ?? h.name }) })),
                  ]}
                />
                {errorText(limitKeys.filter((k) => k !== 'habitError.weeklyTarget')) && (
                  <span className="field-error">{errorText(limitKeys.filter((k) => k !== 'habitError.weeklyTarget'))}</span>
                )}
              </div>
            )}
          </div>
          {otherError && <span className="field-error">{otherError}</span>}
        </div>
      </BottomSheet>
      <Dialog open={confirmingDelete} title={t('common.delete')} onClose={() => setConfirmingDelete(false)}>
        <p className="dialog-body">{t('habits.deleteConfirm')}</p>
        <div className="dialog-actions">
          <Button autoFocus onClick={() => setConfirmingDelete(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" onClick={remove}>
            {t('common.delete')}
          </Button>
        </div>
      </Dialog>
    </>
  )
}
