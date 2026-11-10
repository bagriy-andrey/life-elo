import type { ReactNode } from 'react'
import './TabBar.css'

export interface TabItem<T extends string> {
  id: T
  label: string
  /** Shown instead of the label on narrow screens (≤600px); the label stays as the accessible name. */
  icon?: ReactNode
  /** Shows an attention dot. */
  badge?: boolean
}

interface Props<T extends string> {
  items: TabItem<T>[]
  active: T
  onSelect: (id: T) => void
}

export function TabBar<T extends string>({ items, active, onSelect }: Props<T>) {
  return (
    <nav className="tabbar">
      {items.map((item) => (
        <button
          key={item.id}
          className={[active === item.id ? 'on' : '', item.icon ? 'has-icon' : ''].filter(Boolean).join(' ')}
          onClick={() => onSelect(item.id)}
        >
          {item.icon && (
            <span className="tab-icon" aria-hidden="true">
              {item.icon}
            </span>
          )}
          <span className="tab-label">{item.label}</span>
          {item.badge && <span className="dot" />}
        </button>
      ))}
    </nav>
  )
}
