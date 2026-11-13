import { FactGrid } from 'life-elo'

export const Heart = () => (
  <FactGrid
    items={[
      { label: 'Пульс покоя', value: '46 уд/мин', hint: 'за 7 дней 48' },
      { label: 'Минимум', value: '42 уд/мин' },
      { label: 'Максимум', value: '118 уд/мин' },
      { label: 'HRV', value: '55 мс' },
    ]}
  />
)

export const Short = () => (
  <FactGrid
    items={[
      { label: 'Дистанция', value: '9,76 км' },
      { label: 'Этажи', value: '12' },
      { label: 'Калории', value: '2 480' },
    ]}
  />
)
