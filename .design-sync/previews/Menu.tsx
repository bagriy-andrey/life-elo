import { Card, Menu } from 'life-elo'

const items = [
  { id: 'info', label: 'Информация' },
  { id: 'edit', label: 'Изменить' },
  { id: 'pause', label: 'Пауза' },
  { id: 'delete', label: 'Удалить', tone: 'danger' as const, separatorBefore: true },
]

// The popover opens on click; previews open it once via a ref callback (no pointerdown, so it stays open).
const openOnMount = (el: HTMLDivElement | null) => {
  if (el) setTimeout(() => el.querySelector<HTMLButtonElement>('.menu-trigger')?.click(), 0)
}

const habitRow = (
  <Card>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--pos)', flex: 'none' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
        <strong>Подъём</strong>
        <span style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          Конструктивная · Сильная · до 07:00, терпимо до 07:30
        </span>
      </div>
      <Menu items={items} onSelect={() => {}} triggerLabel="Действия с привычкой" />
    </div>
  </Card>
)

export const InHabitCard = () => <div style={{ maxWidth: 420 }}>{habitRow}</div>

export const Open = () => (
  <div ref={openOnMount} style={{ maxWidth: 420, minHeight: 280 }}>
    {habitRow}
  </div>
)

export const PageHeader = () => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 420 }}>
    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>‹ Назад</span>
    <Menu items={items.slice(1)} onSelect={() => {}} triggerLabel="Действия с привычкой" />
  </div>
)
