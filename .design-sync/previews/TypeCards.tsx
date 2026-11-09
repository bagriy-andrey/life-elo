import { useState } from 'react'
import { TypeCards } from 'life-elo'

const options = [
  { value: 'constructive', title: 'Конструктивная', description: 'Делаю — рейтинг растёт', tone: 'pos' as const },
  { value: 'destructive', title: 'Нежелательная', description: 'Срываюсь — рейтинг падает', tone: 'neg' as const },
]

export const Constructive = () => {
  const [v, setV] = useState('constructive')
  return <div style={{ width: 340 }}><TypeCards label="Тип" options={options} value={v} onChange={setV} /></div>
}
export const Destructive = () => {
  const [v, setV] = useState('destructive')
  return <div style={{ width: 340 }}><TypeCards label="Тип" options={options} value={v} onChange={setV} /></div>
}
export const Locked = () => <div style={{ width: 340 }}><TypeCards label="Тип" options={options} value="destructive" onChange={() => {}} disabled /></div>
