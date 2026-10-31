import './TabBar.css'

export interface TabItem<T extends string> {
  id: T
  label: string
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
        <button key={item.id} className={active === item.id ? 'on' : ''} onClick={() => onSelect(item.id)}>
          {item.label}
          {item.badge && <span className="dot" />}
        </button>
      ))}
    </nav>
  )
}
