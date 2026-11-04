import { useState } from 'react'
import { db, newId } from '../db/db'
import { deleteHabit, ReducerInUseError } from '../db/habits'
import { dayOf } from '../domain/day'
import {
  buildQuota,
  buildRule,
  EMPTY_FORM,
  editedVersions,
  formOf,
  hasAnswers,
  validateReducer,
  type SetupError,
  type HabitForm,
  type RuleChoice,
} from '../domain/habitSetup'
import { settingsOn } from '../domain/settings'
import type { DayReview, Habit, HabitDirection, HabitVersion, ImpactTier } from '../domain/types'
import { Button, Card, SegmentedControl } from './components'
import { groupByDirectionAndTier } from './grouping'
import { useI18n } from '../i18n'
import {
  betterLabels,
  directionEditLabels,
  directionGroupLabels,
  directionLabels,
  quotaSummary,
  ruleChoiceLabels,
  ruleSummary,
  TIER_COLOR,
  tierGroupLabels,
  tierLabels,
  unitLabels,
} from './labels'

const options = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))

interface Props {
  habits: Habit[]
  /** Stored reviews: decide whether a habit's direction can still change. */
  reviews: DayReview[]
  /** New habits become reviewable starting from this day. */
  effectiveFrom: string
}

interface FieldsProps {
  form: HabitForm
  onChange: (form: HabitForm) => void
  /** Habits that can serve as a quota reducer (never the one being edited). */
  reducers: Habit[]
  /** Decides what an empty «Терпимо» means (constructive: never bad). */
  direction: HabitDirection
}

function RuleFields({ form, onChange, reducers, direction }: FieldsProps) {
  const { t } = useI18n()
  const RULE_CHOICE_LABEL = ruleChoiceLabels(t)
  const BETTER_LABEL = betterLabels(t)
  const units = unitLabels(t, 5)
  const unitHint = (kind: Exclude<RuleChoice, 'boolean'>) =>
    kind === 'time' ? t('habits.timeHint') : units[kind]
  const set = (patch: Partial<HabitForm>) => onChange({ ...form, ...patch })
  const measured = form.kind !== 'boolean'
  const isTime = form.kind === 'time'
  // Visible caption above each threshold: the placeholder disappears once a value is entered.
  const field = (key: 'excellent' | 'ok' | 'tolerable', label: string, placeholder: string) => (
    <label className="stack-sm">
      <span className="muted">{label}</span>
      <input
        type={isTime ? 'time' : 'number'}
        inputMode={isTime ? undefined : 'decimal'}
        min={isTime ? undefined : 0}
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => set({ [key]: e.target.value })}
      />
    </label>
  )
  const emptyTolerable =
    direction === 'constructive' ? t('habits.emptyTolerableConstructive') : t('habits.emptyTolerableDestructive')
  return (
    <>
      <SegmentedControl
        value={form.kind}
        onChange={(kind) => set({ kind })}
        options={options(RULE_CHOICE_LABEL)}
      />
      {measured && (
        <>
          <SegmentedControl
            value={form.better}
            onChange={(better) => set({ better })}
            options={options(BETTER_LABEL)}
          />
          <span className="muted">{t('habits.thresholdsHint', { unit: unitHint(form.kind as Exclude<RuleChoice, 'boolean'>) })}</span>
          {field('excellent', t('habits.excellent'), t('habits.threshold'))}
          {field('ok', t('habits.ok'), t('habits.threshold'))}
          {field('tolerable', t('habits.tolerable'), emptyTolerable)}
        </>
      )}
      {form.kind === 'count' && (
        <>
          <span className="muted">{t('habits.limitOptional')}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={t('habits.perDay')}
            aria-label={t('habits.perDayAria')}
            value={form.perDay}
            onChange={(e) => set({ perDay: e.target.value })}
          />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={t('habits.perWeek')}
            aria-label={t('habits.perWeekAria')}
            value={form.perWeek}
            onChange={(e) => set({ perWeek: e.target.value })}
          />
          <select
            aria-label={t('habits.reducedByAria')}
            value={form.reducedByDaysOf}
            onChange={(e) => set({ reducedByDaysOf: e.target.value })}
          >
            <option value="">{t('habits.notReduced')}</option>
            {reducers.map((h) => (
              <option key={h.id} value={h.id}>
                {t('habits.reducedBy', { name: h.name })}
              </option>
            ))}
          </select>
        </>
      )}
    </>
  )
}

const today = () => dayOf(new Date())

export function Habits({ habits, reviews, effectiveFrom }: Props) {
  const { t } = useI18n()
  const DIRECTION_EDIT_LABEL = directionEditLabels(t)
  const DIRECTION_GROUP_LABEL = directionGroupLabels(t)
  const DIRECTION_LABEL = directionLabels(t)
  const TIER_GROUP_LABEL = tierGroupLabels(t)
  const TIER_LABEL = tierLabels(t)
  const [name, setName] = useState('')
  const [direction, setDirection] = useState<HabitDirection>('destructive')
  const [tier, setTier] = useState<ImpactTier>('medium')
  const [form, setForm] = useState<HabitForm>(EMPTY_FORM)
  const [error, setError] = useState<SetupError>()

  const [editingId, setEditingId] = useState<string>()
  const [editTier, setEditTier] = useState<ImpactTier>('medium')
  const [editForm, setEditForm] = useState<HabitForm>(EMPTY_FORM)
  const [editError, setEditError] = useState<SetupError>()
  const [editName, setEditName] = useState('')
  const [editDirection, setEditDirection] = useState<HabitDirection>('destructive')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const nameOf = (id: string) => habits.find((h) => h.id === id)?.name

  /** Validated settings from a form, or an error message. */
  const settingsFrom = (f: HabitForm, habitId: string | undefined, day: string) => {
    const rule = buildRule(f)
    if (!rule.ok) return { error: rule.error }
    const quota = buildQuota(f)
    if (!quota.ok) return { error: quota.error }
    const reducerError = validateReducer(habitId, quota.value, habits, day)
    if (reducerError) return { error: reducerError }
    return { rule: rule.value, quota: quota.value }
  }

  const add = async () => {
    if (!name.trim()) return
    const s = settingsFrom(form, undefined, effectiveFrom)
    if ('error' in s) return setError(s.error)
    const version: HabitVersion = { from: effectiveFrom, tier, rule: s.rule }
    if (s.quota) version.quota = s.quota
    await db.habits.add({
      id: newId(),
      name: name.trim(),
      direction,
      versions: [version],
      active: true,
      effectiveFrom,
      createdAt: Date.now(),
    })
    setName('')
    setForm(EMPTY_FORM)
    setError(undefined)
  }

  const startEdit = (h: Habit) => {
    const cur = settingsOn(h, today())
    setEditingId(h.id)
    setEditTier(cur.tier)
    setEditForm(formOf(cur.rule, cur.quota))
    setEditError(undefined)
    setEditName(h.name)
    setEditDirection(h.direction)
    setConfirmingDelete(false)
  }

  const remove = async (h: Habit) => {
    try {
      await deleteHabit(h.id)
      setEditingId(undefined)
    } catch (e) {
      if (e instanceof ReducerInUseError) {
        const names = e.users.map((u) => `«${u.name}»`).join(', ')
        setEditError({ key: 'habitError.deleteInUse', params: { names } })
        setConfirmingDelete(false)
      } else throw e
    }
  }

  const saveEdit = async (h: Habit) => {
    const day = today()
    const newName = editName.trim()
    if (!newName) return setEditError({ key: 'habitError.nameEmpty' })
    const s = settingsFrom(editForm, h.id, day)
    if ('error' in s) return setEditError(s.error)
    const versions = editedVersions(h, { tier: editTier, rule: s.rule, quota: s.quota }, day)
    const canFlip = !hasAnswers(h.id, reviews)
    await db.habits.update(h.id, {
      versions,
      name: newName,
      direction: canFlip ? editDirection : h.direction,
    })
    setEditingId(undefined)
  }

  const renderHabit = (h: Habit) => {
    const cur = settingsOn(h, today())
    if (editingId === h.id) {
      const locked = hasAnswers(h.id, reviews)
      return (
        <Card key={h.id} className="stack-sm">
          <input
            aria-label={t('habits.namePlaceholder')}
            placeholder={t('habits.namePlaceholder')}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          {locked ? (
            <>
              <span className="muted">{t('habits.directionLabel', { direction: DIRECTION_EDIT_LABEL[h.direction] })}</span>
              <span className="muted">{t('habits.directionLocked')}</span>
            </>
          ) : (
            <SegmentedControl
              value={editDirection}
              onChange={setEditDirection}
              options={options(DIRECTION_EDIT_LABEL)}
            />
          )}
          <span className="muted">{t('habits.changesFromToday')}</span>
          <SegmentedControl value={editTier} onChange={setEditTier} options={options(TIER_LABEL)} />
          <RuleFields
            form={editForm}
            onChange={setEditForm}
            reducers={habits.filter((x) => x.id !== h.id)}
            direction={locked ? h.direction : editDirection}
          />
          {editError && <span className="neg">{t(editError.key, editError.params)}</span>}
          <Button variant="primary" onClick={() => saveEdit(h)}>
            {t('common.save')}
          </Button>
          <Button onClick={() => setEditingId(undefined)}>{t('common.cancel')}</Button>
          {confirmingDelete ? (
            <>
              <span className="neg">{t('habits.deleteConfirm')}</span>
              <Button onClick={() => remove(h)}>{t('common.delete')}</Button>
              <Button onClick={() => setConfirmingDelete(false)}>{t('common.cancel')}</Button>
            </>
          ) : (
            <Button onClick={() => setConfirmingDelete(true)}>{t('common.delete')}</Button>
          )}
        </Card>
      )
    }
    return (
      <Card key={h.id} className="row" inactive={!h.active} style={{ borderLeft: `4px solid ${TIER_COLOR[cur.tier]}` }}>
        <div className="stack-sm">
          <strong>{h.name}</strong>
          <span className="muted">{ruleSummary(t, cur.rule)}</span>
          {cur.quota && <span className="muted">{quotaSummary(t, cur.quota, nameOf)}</span>}
        </div>
        <div className="stack-sm">
          <Button onClick={() => startEdit(h)}>{t('common.edit')}</Button>
          <Button onClick={() => db.habits.update(h.id, { active: !h.active })}>
            {h.active ? t('habits.pause') : t('habits.resume')}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <section className="stack">
      <Card className="stack-sm">
        <input
          placeholder={t('habits.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <SegmentedControl value={direction} onChange={setDirection} options={options(DIRECTION_LABEL)} />
        <SegmentedControl value={tier} onChange={setTier} options={options(TIER_LABEL)} />
        <RuleFields form={form} onChange={setForm} reducers={habits} direction={direction} />
        {error && <span className="neg">{t(error.key, error.params)}</span>}
        <Button variant="primary" onClick={add} disabled={!name.trim()}>
          {t('common.add')}
        </Button>
      </Card>

      {groupByDirectionAndTier(habits, (h) => ({
        direction: h.direction,
        tier: settingsOn(h, today()).tier,
      })).map((g) => (
        <section key={g.direction} className="stack">
          <h2>{DIRECTION_GROUP_LABEL[g.direction]}</h2>
          {g.tiers.map((t) => (
            <div key={t.tier} className="stack">
              <span className="muted">
                <span style={{ color: TIER_COLOR[t.tier] }}>●</span> {TIER_GROUP_LABEL[t.tier]}
              </span>
              {t.items.map(renderHabit)}
            </div>
          ))}
        </section>
      ))}
    </section>
  )
}
