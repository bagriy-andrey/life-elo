import { Menu } from 'life-elo'

const items = [
  { id: 'info', label: 'Информация' },
  { id: 'edit', label: 'Изменить' },
  { id: 'pause', label: 'Пауза' },
  { id: 'delete', label: 'Удалить', tone: 'danger' as const, separatorBefore: true },
]

export const Closed = () => (
  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
    <Menu items={items} onSelect={() => {}} triggerLabel="Действия с привычкой" />
  </div>
)
