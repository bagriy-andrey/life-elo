import { Pill } from 'life-elo'

export const Positive = () => <Pill>Чистых дней подряд: 5</Pill>

export const Negative = () => <Pill tone="neg">Срыв 2 дня подряд</Pill>

export const Tones = () => (
  <div className="row" style={{ justifyContent: 'flex-start' }}>
    <Pill tone="pos">+12 за неделю</Pill>
    <Pill tone="neg">−4 за неделю</Pill>
  </div>
)
