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

// Phone app: each tab passes an icon (24px stroke SVG in currentColor); on screens ≤600px the icon replaces the label.
const Svg = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const icons = {
  home: (
    <Svg>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Svg>
  ),
  review: (
    <Svg>
      <rect width={8} height={4} x={8} y={2} rx={1} ry={1} />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </Svg>
  ),
  habits: (
    <Svg>
      <circle cx={12} cy={12} r={10} />
      <circle cx={12} cy={12} r={6} />
      <circle cx={12} cy={12} r={2} />
    </Svg>
  ),
  profile: (
    <Svg>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx={12} cy={7} r={4} />
    </Svg>
  ),
}

export const WithIcons = () => {
  const [active, setActive] = useState('home')
  return (
    <Phone>
      <TabBar
        active={active}
        onSelect={setActive}
        items={[
          { id: 'home', label: 'Главная', icon: icons.home },
          { id: 'review', label: 'Обзор дня', icon: icons.review, badge: true },
          { id: 'habits', label: 'Привычки', icon: icons.habits },
          { id: 'profile', label: 'Профиль', icon: icons.profile },
        ]}
      />
    </Phone>
  )
}

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
