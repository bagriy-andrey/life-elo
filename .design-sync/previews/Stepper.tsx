import { useState } from 'react'
import { Stepper } from 'life-elo'

export const Weekly = () => {
  const [v, setV] = useState(4)
  return <div style={{ width: 340 }}><Stepper value={v} min={1} max={7} onChange={setV} decLabel="Меньше" incLabel="Больше" label="Дней в неделю" /></div>
}
export const AtMinimum = () => <div style={{ width: 340 }}><Stepper value={1} min={1} max={7} onChange={() => {}} decLabel="Меньше" incLabel="Больше" label="Дней в неделю" /></div>
