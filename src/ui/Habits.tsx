import { useState } from 'react'
import { db, newId } from '../db/db'
import { dayOf } from '../domain/day'
import {
  buildQuota,
  buildRule,
  EMPTY_FORM,
  editedVersions,
  formOf,
  validateReducer,
  type HabitForm,
  type RuleChoice,
} from '../domain/habitSetup'
import { settingsOn } from '../domain/settings'
import type { Habit, HabitDirection, HabitVersion, ImpactTier } from '../domain/types'
import { Button, Card, SegmentedControl } from './components'
import { groupByDirectionAndTier } from './grouping'
import {
  BETTER_LABEL,
  DIRECTION_GROUP_LABEL,
  DIRECTION_LABEL,
  quotaSummary,
  RULE_CHOICE_LABEL,
  ruleSummary,
  TIER_COLOR,
  TIER_GROUP_LABEL,
  TIER_LABEL,
} from './labels'

const options = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))

interface Props {
  habits: Habit[]
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

const UNIT_HINT: Record<Exclude<RuleChoice, 'boolean'>, string> = {
  count: 'раз',
  minutes: 'мин',
  steps: 'шагов',
  time: 'ЧЧ:ММ',
}

function RuleFields({ form, onChange, reducers, direction }: FieldsProps) {
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
    direction === 'constructive' ? 'Пусто — хуже порога будет «Терпимо», 0 очков' : 'Пусто — хуже порога будет «Плохо»'
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
          <span className="muted">Пороги включительно, {UNIT_HINT[form.kind as Exclude<RuleChoice, 'boolean'>]}</span>
          {field('excellent', 'Отлично', 'Порог')}
          {field('ok', 'В рамках (необяз.)', 'Порог')}
          {field('tolerable', 'Терпимо (необяз.)', emptyTolerable)}
        </>
      )}
      {form.kind === 'count' && (
        <>
          <span className="muted">Лимит (необязательно)</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="В день"
            aria-label="Лимит в день"
            value={form.perDay}
            onChange={(e) => set({ perDay: e.target.value })}
          />
          <input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="В неделю"
            aria-label="Лимит в неделю"
            value={form.perWeek}
            onChange={(e) => set({ perWeek: e.target.value })}
          />
          <select
            aria-label="Уменьшается днями привычки"
            value={form.reducedByDaysOf}
            onChange={(e) => set({ reducedByDaysOf: e.target.value })}
          >
            <option value="">Лимит не уменьшается</option>
            {reducers.map((h) => (
              <option key={h.id} value={h.id}>
                Уменьшается днями «{h.name}»
              </option>
            ))}
          </select>
        </>
      )}
    </>
  )
}

const today = () => dayOf(new Date())

export function Habits({ habits, effectiveFrom }: Props) {
  const [name, setName] = useState('')
  const [direction, setDirection] = useState<HabitDirection>('destructive')
  const [tier, setTier] = useState<ImpactTier>('medium')
  const [form, setForm] = useState<HabitForm>(EMPTY_FORM)
  const [error, setError] = useState<string>()

  const [editingId, setEditingId] = useState<string>()
  const [editTier, setEditTier] = useState<ImpactTier>('medium')
  const [editForm, setEditForm] = useState<HabitForm>(EMPTY_FORM)
  const [editError, setEditError] = useState<string>()

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
  }

  const saveEdit = async (h: Habit) => {
    const day = today()
    const s = settingsFrom(editForm, h.id, day)
    if ('error' in s) return setEditError(s.error)
    const versions = editedVersions(h, { tier: editTier, rule: s.rule, quota: s.quota }, day)
    await db.habits.update(h.id, { versions })
    setEditingId(undefined)
  }

  const renderHabit = (h: Habit) => {
    const cur = settingsOn(h, today())
    if (editingId === h.id) {
      return (
        <Card key={h.id} className="stack-sm">
          <strong>{h.name}</strong>
          <span className="muted">Изменения действуют с сегодняшнего дня</span>
          <SegmentedControl value={editTier} onChange={setEditTier} options={options(TIER_LABEL)} />
          <RuleFields
            form={editForm}
            onChange={setEditForm}
            reducers={habits.filter((x) => x.id !== h.id)}
            direction={h.direction}
          />
          {editError && <span className="neg">{editError}</span>}
          <Button variant="primary" onClick={() => saveEdit(h)}>
            Сохранить
          </Button>
          <Button onClick={() => setEditingId(undefined)}>Отмена</Button>
        </Card>
      )
    }
    return (
      <Card key={h.id} className="row" inactive={!h.active} style={{ borderLeft: `4px solid ${TIER_COLOR[cur.tier]}` }}>
        <div className="stack-sm">
          <strong>{h.name}</strong>
          <span className="muted">{ruleSummary(cur.rule)}</span>
          {cur.quota && <span className="muted">{quotaSummary(cur.quota, nameOf)}</span>}
        </div>
        <div className="stack-sm">
          <Button onClick={() => startEdit(h)}>Изменить</Button>
          <Button onClick={() => db.habits.update(h.id, { active: !h.active })}>
            {h.active ? 'Пауза' : 'Вернуть'}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <section className="stack">
      <Card className="stack-sm">
        <input
          placeholder="Название привычки"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <SegmentedControl value={direction} onChange={setDirection} options={options(DIRECTION_LABEL)} />
        <SegmentedControl value={tier} onChange={setTier} options={options(TIER_LABEL)} />
        <RuleFields form={form} onChange={setForm} reducers={habits} direction={direction} />
        {error && <span className="neg">{error}</span>}
        <Button variant="primary" onClick={add} disabled={!name.trim()}>
          Добавить
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
