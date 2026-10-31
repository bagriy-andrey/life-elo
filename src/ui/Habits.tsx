import { useState } from 'react'
import { db, newId } from '../db/db'
import type { Habit, HabitDirection, ImpactTier } from '../domain/types'
import { DIRECTION_LABEL, TIER_LABEL } from './labels'

interface Props {
  habits: Habit[]
  /** New habits become reviewable starting from this day. */
  effectiveFrom: string
}

export function Habits({ habits, effectiveFrom }: Props) {
  const [name, setName] = useState('')
  const [direction, setDirection] = useState<HabitDirection>('destructive')
  const [tier, setTier] = useState<ImpactTier>('medium')

  const add = async () => {
    if (!name.trim()) return
    await db.habits.add({
      id: newId(),
      name: name.trim(),
      direction,
      tier,
      rule: { kind: 'boolean' },
      active: true,
      effectiveFrom,
      createdAt: Date.now(),
    })
    setName('')
  }

  return (
    <section className="stack">
      <div className="card stack-sm">
        <input
          placeholder="Название привычки"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="segmented">
          {(Object.keys(DIRECTION_LABEL) as HabitDirection[]).map((d) => (
            <button key={d} className={direction === d ? 'on' : ''} onClick={() => setDirection(d)}>
              {DIRECTION_LABEL[d]}
            </button>
          ))}
        </div>
        <div className="segmented">
          {(Object.keys(TIER_LABEL) as ImpactTier[]).map((t) => (
            <button key={t} className={tier === t ? 'on' : ''} onClick={() => setTier(t)}>
              {TIER_LABEL[t]}
            </button>
          ))}
        </div>
        <button className="primary" onClick={add} disabled={!name.trim()}>
          Добавить
        </button>
      </div>

      {habits.map((h) => (
        <div key={h.id} className={`card row ${h.active ? '' : 'inactive'}`}>
          <div className="stack-sm">
            <strong>{h.name}</strong>
            <span className="muted">
              {DIRECTION_LABEL[h.direction]} · {TIER_LABEL[h.tier]}
            </span>
          </div>
          <button onClick={() => db.habits.update(h.id, { active: !h.active })}>
            {h.active ? 'Пауза' : 'Вернуть'}
          </button>
        </div>
      ))}
    </section>
  )
}
