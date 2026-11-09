import { useState } from 'react'
import { ChipGroup } from 'life-elo'

export const Measures = () => {
  const [v, setV] = useState('boolean')
  return (
    <div style={{ width: 340 }}>
      <ChipGroup
        label="Как отмечать"
        value={v}
        onChange={setV}
        options={[
          { value: 'boolean', label: 'Да / нет' },
          { value: 'count', label: 'Число' },
          { value: 'minutes', label: 'Минуты' },
          { value: 'steps', label: 'Шаги' },
          { value: 'time', label: 'Время' },
        ]}
      />
    </div>
  )
}
