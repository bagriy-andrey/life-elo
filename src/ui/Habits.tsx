import { useState } from 'react'
import { db, newId } from '../db/db'
import type { Habit, HabitDirection, ImpactTier } from '../domain/types'
import { Button, Card, SegmentedControl } from './components'
import { DIRECTION_LABEL, TIER_LABEL } from './labels'

const options = <T extends string>(labels: Record<T, string>) =>
  (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))

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
      <Card className="stack-sm">
        <input
          placeholder="Название привычки"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <SegmentedControl value={direction} onChange={setDirection} options={options(DIRECTION_LABEL)} />
        <SegmentedControl value={tier} onChange={setTier} options={options(TIER_LABEL)} />
        <Button variant="primary" onClick={add} disabled={!name.trim()}>
          Добавить
        </Button>
      </Card>

      {habits.map((h) => (
        <Card key={h.id} className="row" inactive={!h.active}>
          <div className="stack-sm">
            <strong>{h.name}</strong>
            <span className="muted">
              {DIRECTION_LABEL[h.direction]} · {TIER_LABEL[h.tier]}
            </span>
          </div>
          <Button onClick={() => db.habits.update(h.id, { active: !h.active })}>
            {h.active ? 'Пауза' : 'Вернуть'}
          </Button>
        </Card>
      ))}
    </section>
  )
}
