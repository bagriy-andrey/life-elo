import { useState } from 'react'
import { Select } from 'life-elo'

const THEMES = [
  { value: 'system', label: 'Как в системе' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
]

export const Default = () => {
  const [v, setV] = useState('system')
  return <Select label="Тема" options={THEMES} value={v} onChange={setV} />
}

export const Placeholder = () => {
  const [v, setV] = useState<string>()
  return (
    <Select
      label="Уменьшается днями"
      placeholder="Выберите привычку"
      options={[
        { value: 'run', label: 'Пробежка 5 км' },
        { value: 'gym', label: 'Спортзал' },
      ]}
      value={v}
      onChange={setV}
    />
  )
}

export const Disabled = () => <Select label="Тема" options={THEMES} value="dark" onChange={() => {}} disabled />
