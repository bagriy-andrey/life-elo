import { StatTile } from 'life-elo'

const rows = (strong: number, medium: number, weak: number) => [
  { label: 'Сильные', value: strong, level: 3 as const },
  { label: 'Средние', value: medium, level: 2 as const },
  { label: 'Слабые', value: weak, level: 1 as const },
]

export const Constructive = () => <StatTile title="Конструктивные" total={4} tone="pos" rows={rows(2, 1, 1)} />

export const Destructive = () => <StatTile title="Нежелательные" total={2} tone="neg" rows={rows(0, 2, 0)} />

export const SummaryPair = () => (
  <section
    aria-label="Сводка по привычкам"
    style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}
  >
    <StatTile title="Конструктивные" total={4} tone="pos" rows={rows(2, 1, 1)} />
    <StatTile title="Нежелательные" total={2} tone="neg" rows={rows(0, 2, 0)} />
  </section>
)
