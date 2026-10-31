import { useState } from 'react'
import { TabBar } from 'life-elo'

// TabBar is position: fixed to the bottom of the viewport. The transformed
// frame becomes its containing block, so it pins to the frame's bottom edge
// like it does on a phone screen.
const Phone = ({ children }: { children: React.ReactNode }) => (
  <div style={{ position: 'relative', width: 390, height: 120, transform: 'translateZ(0)', background: 'var(--bg)' }}>
    {children}
  </div>
)

export const WithBadge = () => {
  const [active, setActive] = useState('home')
  return (
    <Phone>
      <TabBar
        active={active}
        onSelect={setActive}
        items={[
          { id: 'home', label: 'Главная' },
          { id: 'review', label: 'Обзор дня', badge: true },
          { id: 'habits', label: 'Привычки' },
        ]}
      />
    </Phone>
  )
}

export const HabitsActive = () => {
  const [active, setActive] = useState('habits')
  return (
    <Phone>
      <TabBar
        active={active}
        onSelect={setActive}
        items={[
          { id: 'home', label: 'Главная' },
          { id: 'review', label: 'Обзор дня' },
          { id: 'habits', label: 'Привычки' },
        ]}
      />
    </Phone>
  )
}
