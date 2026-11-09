import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { cx } from './cx'
import './Menu.css'

export interface MenuItem {
  id: string
  label: string
  tone?: 'danger'
  separatorBefore?: boolean
}

interface Props {
  items: MenuItem[]
  onSelect: (id: string) => void
  /** Accessible name of the ⋮ trigger button. */
  triggerLabel: string
  className?: string
}

const GAP = 6

/** Opens below the trigger unless the menu does not fit there and there is more room above. */
export function placeMenu(
  rect: { top: number; bottom: number },
  menuHeight: number,
  viewportHeight: number,
): 'below' | 'above' {
  const below = viewportHeight - rect.bottom - GAP
  const above = rect.top - GAP
  return below >= menuHeight || below >= above ? 'below' : 'above'
}

/** ⋮ trigger with a small popover menu (role=menu); closes on outside tap, Esc, second tap and after select. */
export function Menu({ items, onSelect, triggerLabel, className }: Props) {
  const [open, setOpen] = useState(false)
  const [side, setSide] = useState<'below' | 'above'>('below')
  const rootRef = useRef<HTMLSpanElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return
    setSide(placeMenu(triggerRef.current.getBoundingClientRect(), menuRef.current.offsetHeight, window.innerHeight))
  }, [open])

  useEffect(() => {
    if (!open) return
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const els = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
      const i = els.indexOf(document.activeElement as HTMLElement)
      const next = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length
      els[next]?.focus()
      e.preventDefault()
    }
  }

  return (
    <span ref={rootRef} className={cx('menu', className)} onKeyDown={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className="menu-trigger"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
      >
        <svg viewBox="0 0 16 16" width="18" height="18" aria-hidden="true">
          <circle cx="8" cy="3" r="1.5" fill="currentColor" />
          <circle cx="8" cy="8" r="1.5" fill="currentColor" />
          <circle cx="8" cy="13" r="1.5" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={triggerLabel}
          className={cx('menu-popover', side === 'above' && 'above')}
          onKeyDown={onKeyDown}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              role="menuitem"
              className={cx('menu-item', it.tone === 'danger' && 'danger', it.separatorBefore && 'separated')}
              onClick={() => {
                setOpen(false)
                onSelect(it.id)
              }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </span>
  )
}
