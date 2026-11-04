import { useState } from 'react'
import { confirmDay } from '../db/db'
import { DayLockedError } from '../db/confirm'
import { addDays, dayOf, isDayLocked } from '../domain/day'
import { settingsOn } from '../domain/settings'
import type { DayReview, Habit, HabitEntry, Zone } from '../domain/types'
import { classifyZone } from '../engine/zones'
import { quotaZone } from '../engine/quota'
import { Button, Card, Pill, SegmentedControl } from './components'
import { groupByDirectionAndTier } from './grouping'
import { useI18n } from '../i18n'
import {
  booleanOptions,
  directionGroupLabels,
  formatDay,
  notApplicableLabel,
  TIER_COLOR,
  tierGroupLabels,
  unitLabels,
  zoneLabels,
  type BooleanAnswer,
} from './labels'

interface Props {
  day: string
  maxDay: string
  habits: Habit[]
  reviews: DayReview[]
  existing?: DayReview
  onDayChange: (day: string) => void
  onDone: () => void
}

type Entries = Record<string, HabitEntry>

const UNKNOWN: HabitEntry = { kind: 'unknown' }
const NOT_APPLICABLE: HabitEntry = { kind: 'not_applicable' }

function answerOf(e: HabitEntry | undefined): BooleanAnswer | undefined {
  if (!e || e.kind === 'unknown') return undefined
  if (e.kind === 'not_applicable') return 'na'
  return e.value ? 'true' : 'false'
}

function entryOfAnswer(a: BooleanAnswer): HabitEntry {
  return a === 'na' ? NOT_APPLICABLE : { kind: 'value', value: a === 'true' }
}

const currentTime = () => new Date()

const toneOfZone = (z: Zone) => (z === 'excellent' || z === 'ok' ? 'pos' : 'neg')

export function Review({ day, maxDay, habits, reviews, existing, onDayChange, onDone }: Props) {
  const { t, locale } = useI18n()
  const BOOLEAN_OPTIONS = booleanOptions(t)
  const DIRECTION_GROUP_LABEL = directionGroupLabels(t)
  const NOT_APPLICABLE_LABEL = notApplicableLabel(t)
  const TIER_GROUP_LABEL = tierGroupLabels(t)
  const UNIT_LABEL = unitLabels(t)
  const ZONE_LABEL = zoneLabels(t)
  const applicable = habits.filter((h) => h.active && h.effectiveFrom <= day)
  // Remounted per day (key), so initial state is the saved review, if any.
  const [entries, setEntries] = useState<Entries>(() => (existing ? { ...existing.entries } : {}))
  const [error, setError] = useState<string>()

  const [now] = useState(currentTime) // fixed at mount; the screen is remounted per day
  const locked = isDayLocked(day, now)
  const minDay = addDays(dayOf(now), -1) // earliest day that is not locked

  const set = (id: string, e: HabitEntry) => setEntries((prev) => ({ ...prev, [id]: e }))

  const zoneOf = (h: Habit): Zone | null => {
    const entry = entries[h.id]
    if (!entry) return null
    const s = settingsOn(h, day)
    if (s.quota) {
      const byDay: Record<string, Entries> = {}
      for (const r of reviews) byDay[r.day] = r.entries
      byDay[day] = entries
      return quotaZone({ id: h.id, quota: s.quota }, day, byDay)
    }
    return classifyZone({ direction: h.direction, rule: s.rule }, entry)
  }

  const confirm = async () => {
    setError(undefined)
    const full: Entries = Object.fromEntries(applicable.map((h) => [h.id, entries[h.id] ?? UNKNOWN]))
    try {
      await confirmDay(day, full, currentTime())
      onDone()
    } catch (e) {
      setError(
        e instanceof DayLockedError
          ? 'День закрыт: исправить его уже нельзя.'
          : 'Не удалось сохранить день. Попробуйте ещё раз.',
      )
    }
  }

  const control = (h: Habit) => {
    const s = settingsOn(h, day)
    const entry = entries[h.id]
    const numeric = s.quota || (s.rule.kind === 'measured' && s.rule.unit !== 'time')
    const timed = !s.quota && s.rule.kind === 'measured' && s.rule.unit === 'time'
    if (!numeric && !timed) {
      return (
        <div className="stack-sm">
          <SegmentedControl
            value={answerOf(entry)}
            onChange={(a) => set(h.id, entryOfAnswer(a))}
            options={BOOLEAN_OPTIONS[h.direction]}
          />
          {entry && entry.kind !== 'unknown' && (
            <Button onClick={() => set(h.id, UNKNOWN)}>Сбросить ответ</Button>
          )}
        </div>
      )
    }
    const unit = s.quota ? 'раз' : s.rule.kind === 'measured' ? UNIT_LABEL[s.rule.unit] : ''
    const na = entry?.kind === 'not_applicable'
    const value = entry?.kind === 'value' ? String(entry.value) : ''
    return (
      <div className="row">
        <input
          type={timed ? 'time' : 'number'}
          inputMode={timed ? undefined : 'decimal'}
          min={timed ? undefined : 0}
          value={value}
          disabled={na}
          aria-label={`${h.name}, ${unit}`}
          onChange={(e) => {
            const v = e.target.value
            if (v === '') return set(h.id, UNKNOWN)
            if (timed) return set(h.id, { kind: 'value', value: v })
            const n = Number(v)
            if (Number.isFinite(n) && n >= 0) set(h.id, { kind: 'value', value: n })
          }}
        />
        <span className="muted">{unit}</span>
        <Button onClick={() => set(h.id, na ? UNKNOWN : NOT_APPLICABLE)}>
          {na ? 'Указать значение' : NOT_APPLICABLE_LABEL}
        </Button>
      </div>
    )
  }

  return (
    <section className="stack">
      <div className="row">
        <h2>{formatDay(day, locale)}</h2>
        <input
          type="date"
          value={day}
          min={minDay}
          max={maxDay}
          onChange={(e) => e.target.value && onDayChange(e.target.value)}
        />
      </div>
      {locked && <p className="muted">День закрыт. Его можно только посмотреть.</p>}
      {!locked && existing && (
        <p className="muted">День уже подтверждён. Изменения пересчитают рейтинг.</p>
      )}
      {applicable.length === 0 && (
        <p className="muted">Нет привычек для этого дня. Добавьте их во вкладке «Привычки».</p>
      )}
      {groupByDirectionAndTier(applicable, (h) => ({
        direction: h.direction,
        tier: settingsOn(h, day).tier,
      })).map((g) => (
        <section key={g.direction} className="stack">
          <h2>{DIRECTION_GROUP_LABEL[g.direction]}</h2>
          {g.tiers.map((t) => (
            <div key={t.tier} className="stack">
              <span className="muted">
                <span style={{ color: TIER_COLOR[t.tier] }}>●</span> {TIER_GROUP_LABEL[t.tier]}
              </span>
              {t.items.map((h) => {
                const zone = zoneOf(h)
                return (
                  <Card key={h.id} className="stack-sm" style={{ borderLeft: `4px solid ${TIER_COLOR[t.tier]}` }}>
                    <div className="row">
                      <strong>{h.name}</strong>
                      {zone && zone !== 'tolerable' && <Pill tone={toneOfZone(zone)}>{ZONE_LABEL[zone]}</Pill>}
                    </div>
                    <fieldset className="plain" disabled={locked}>
                      {control(h)}
                    </fieldset>
                  </Card>
                )
              })}
            </div>
          ))}
        </section>
      ))}
      {applicable.length > 0 && !locked && (
        <>
          <p className="muted">Без ответа — «не помню», это не влияет на рейтинг.</p>
          {error && <p className="neg" role="alert">{error}</p>}
          <Button variant="primary" onClick={confirm}>
            {existing ? 'Сохранить исправление' : 'Подтвердить день'}
          </Button>
        </>
      )}
    </section>
  )
}
