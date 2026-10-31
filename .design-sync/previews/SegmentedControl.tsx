import { useState } from 'react'
import { SegmentedControl } from 'life-elo'

export const OutcomeDone = () => {
  const [v, setV] = useState('done')
  return (
    <div style={{ width: 340 }}>
      <SegmentedControl
        value={v}
        onChange={setV}
        options={[
          { value: 'done', label: 'Сделал', tone: 'pos' },
          { value: 'not_done', label: 'Не сделал' },
          { value: 'not_applicable', label: 'Не актуально' },
        ]}
      />
    </div>
  )
}

export const OutcomeViolated = () => {
  const [v, setV] = useState('violated')
  return (
    <div style={{ width: 340 }}>
      <SegmentedControl
        value={v}
        onChange={setV}
        options={[
          { value: 'complied', label: 'Соблюдал', tone: 'pos' },
          { value: 'violated', label: 'Нарушил', tone: 'neg' },
          { value: 'not_applicable', label: 'Не актуально' },
        ]}
      />
    </div>
  )
}

export const AccentTier = () => {
  const [v, setV] = useState('medium')
  return (
    <div style={{ width: 340 }}>
      <SegmentedControl
        value={v}
        onChange={setV}
        options={[
          { value: 'weak', label: 'Слабая' },
          { value: 'medium', label: 'Средняя' },
          { value: 'strong', label: 'Сильная' },
        ]}
      />
    </div>
  )
}

export const Unanswered = () => (
  <div style={{ width: 340 }}>
    <SegmentedControl
      onChange={() => {}}
      options={[
        { value: 'done', label: 'Сделал', tone: 'pos' },
        { value: 'not_done', label: 'Не сделал' },
        { value: 'not_applicable', label: 'Не актуально' },
      ]}
    />
  </div>
)
