import { useState } from 'react'
import { confirmDay } from '../db/db'
import type { DayReview, Habit, HabitOutcome } from '../domain/types'
import { formatDay, OUTCOME_LABEL, OUTCOMES_FOR } from './labels'

interface Props {
  day: string
  maxDay: string
  habits: Habit[]
  existing?: DayReview
  onDayChange: (day: string) => void
  onDone: () => void
}

export function Review({ day, maxDay, habits, existing, onDayChange, onDone }: Props) {
  const applicable = habits.filter((h) => h.active && h.effectiveFrom <= day)
  // Remounted per day (key), so initial state is the saved review, if any.
  const [outcomes, setOutcomes] = useState<Record<string, HabitOutcome>>(
    () => existing?.outcomes ?? {},
  )

  const set = (id: string, o: HabitOutcome) => setOutcomes((prev) => ({ ...prev, [id]: o }))

  const confirm = async () => {
    const full = Object.fromEntries(
      applicable.map((h) => [h.id, outcomes[h.id] ?? ('unknown' as const)]),
    )
    await confirmDay(day, full)
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
        <div key={h.id} className="card stack-sm">
          <strong>{h.name}</strong>
          <div className="segmented">
            {OUTCOMES_FOR[h.direction].map((o) => (
              <button
                key={o}
                className={outcomes[h.id] === o ? `on ${o}` : ''}
                onClick={() => set(h.id, o)}
              >
                {OUTCOME_LABEL[o]}
              </button>
            ))}
          </div>
        </div>
      ))}
      {applicable.length > 0 && (
        <>
          <p className="muted">Без ответа — «не помню», это не влияет на рейтинг.</p>
          <button className="primary" onClick={confirm}>
            {existing ? 'Сохранить исправление' : 'Подтвердить день'}
          </button>
        </>
      )}
    </section>
  )
}
