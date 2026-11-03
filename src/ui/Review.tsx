import { useState } from 'react'
import { confirmDay } from '../db/db'
import { entriesOf } from '../domain/legacy'
import type { DayReview, Habit, HabitEntry, HabitOutcome } from '../domain/types'
import { Button, Card, SegmentedControl } from './components'
import { formatDay, OUTCOME_LABEL, OUTCOME_TONE, OUTCOMES_FOR } from './labels'

interface Props {
  day: string
  maxDay: string
  habits: Habit[]
  existing?: DayReview
  onDayChange: (day: string) => void
  onDone: () => void
}

// Transitional (until the zone UI in step 10): the screen still edits boolean outcomes.
function outcomeOf(h: Habit, e: HabitEntry): HabitOutcome {
  if (e.kind !== 'value') return e.kind
  const done = e.value === true
  if (h.direction === 'constructive') return done ? 'done' : 'not_done'
  return done ? 'complied' : 'violated'
}

const currentTime = () => new Date()

function entryOf(o: HabitOutcome): HabitEntry {
  if (o === 'not_applicable' || o === 'unknown') return { kind: o }
  return { kind: 'value', value: o === 'done' || o === 'complied' }
}

export function Review({ day, maxDay, habits, existing, onDayChange, onDone }: Props) {
  const applicable = habits.filter((h) => h.active && h.effectiveFrom <= day)
  // Remounted per day (key), so initial state is the saved review, if any.
  const [outcomes, setOutcomes] = useState<Record<string, HabitOutcome>>(
    () => {
      const entries = existing ? entriesOf(existing) : {}
      return Object.fromEntries(
        habits.filter((h) => h.id in entries).map((h) => [h.id, outcomeOf(h, entries[h.id])]),
      )
    },
  )

  const set = (id: string, o: HabitOutcome) => setOutcomes((prev) => ({ ...prev, [id]: o }))

  const confirm = async () => {
    const full = Object.fromEntries(
      applicable.map((h) => [h.id, entryOf(outcomes[h.id] ?? 'unknown')]),
    )
    await confirmDay(day, full, currentTime())
    onDone()
  }

  return (
    <section className="stack">
      <div className="row">
        <h2>{formatDay(day)}</h2>
        <input
          type="date"
          value={day}
          max={maxDay}
          onChange={(e) => e.target.value && onDayChange(e.target.value)}
        />
      </div>
      {existing && (
        <p className="muted">День уже подтверждён. Изменения пересчитают рейтинг.</p>
      )}
      {applicable.length === 0 && (
        <p className="muted">Нет привычек для этого дня. Добавьте их во вкладке «Привычки».</p>
      )}
      {applicable.map((h) => (
        <Card key={h.id} className="stack-sm">
          <strong>{h.name}</strong>
          <SegmentedControl
            value={outcomes[h.id]}
            onChange={(o) => set(h.id, o)}
            options={OUTCOMES_FOR[h.direction].map((o) => ({
              value: o,
              label: OUTCOME_LABEL[o],
              tone: OUTCOME_TONE[o],
            }))}
          />
        </Card>
      ))}
      {applicable.length > 0 && (
        <>
          <p className="muted">Без ответа — «не помню», это не влияет на рейтинг.</p>
          <Button variant="primary" onClick={confirm}>
            {existing ? 'Сохранить исправление' : 'Подтвердить день'}
          </Button>
        </>
      )}
    </section>
  )
}
