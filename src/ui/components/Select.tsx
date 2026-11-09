import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { cx } from './cx'
import './Select.css'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
}

interface Props<T extends string> {
  options: SelectOption<T>[]
  /** Selected option value; the trigger shows `placeholder` when nothing matches. */
  value?: T
  onChange: (value: T) => void
  /** Accessible name of the trigger and the list. */
  label: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

const GAP = 6
const MIN_LIST = 160

/** Custom dropdown: a field-like trigger and a floating listbox (portal, fixed position, flips above when needed). */
export function Select<T extends string>({ options, value, onChange, label, placeholder, disabled, className }: Props<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [pos, setPos] = useState<CSSProperties | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const id = useId()
  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined

  function show() {
    setActive(Math.max(0, selectedIndex))
    setOpen(true)
  }

  function close(refocus = true) {
    setOpen(false)
    if (refocus) triggerRef.current?.focus()
  }

  function pick(i: number) {
    const o = options[i]
    if (o) onChange(o.value)
    close()
  }

  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const el = triggerRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const vv = window.visualViewport
      const top = vv?.offsetTop ?? 0
      const bottom = top + (vv?.height ?? window.innerHeight)
      const below = bottom - r.bottom - GAP * 2
      const above = r.top - top - GAP * 2
      const up = below < MIN_LIST && above > below
      setPos({
        left: r.left,
        width: r.width,
        maxHeight: Math.min(320, up ? above : below),
        ...(up ? { bottom: window.innerHeight - r.top + GAP } : { top: r.bottom + GAP }),
      })
    }
    // Scrolling the sheet/page under an open list would leave it detached from the trigger.
    function onScroll(e: Event) {
      if (!listRef.current?.contains(e.target as Node)) setOpen(false)
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', onScroll, true)
    window.visualViewport?.addEventListener('resize', place)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', onScroll, true)
      window.visualViewport?.removeEventListener('resize', place)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.focus()
    function onPointerDown(e: PointerEvent) {
      const t = e.target as Node
      if (!listRef.current?.contains(t) && !triggerRef.current?.contains(t)) close(false)
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [open, active, pos])

  function onTriggerKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      show()
    }
  }

  function onListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const last = options.length - 1
    if (e.key === 'ArrowDown') setActive((i) => Math.min(last, i + 1))
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1))
    else if (e.key === 'Home') setActive(0)
    else if (e.key === 'End') setActive(last)
    else if (e.key === 'Enter' || e.key === ' ') pick(active)
    else if (e.key === 'Escape') {
      // Close only the list, not the sheet/dialog around it.
      e.stopPropagation()
      close()
    } else if (e.key === 'Tab') {
      e.stopPropagation()
      close()
    } else return
    e.preventDefault()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={cx('select', open && 'open', className)}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={onTriggerKeyDown}
      >
        <span className={cx('select-value', !selected && 'placeholder')}>{selected?.label ?? placeholder}</span>
        <svg className="select-chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={listRef}
            id={id}
            role="listbox"
            aria-label={label}
            aria-activedescendant={`${id}-${active}`}
            tabIndex={-1}
            className="select-list"
            style={pos}
            onKeyDown={onListKeyDown}
          >
            {options.map((o, i) => (
              <div
                key={o.value}
                id={`${id}-${i}`}
                data-index={i}
                role="option"
                aria-selected={o.value === value}
                className={cx('select-option', i === active && 'active')}
                onPointerMove={() => setActive(i)}
                onClick={() => pick(i)}
              >
                <span>{o.label}</span>
                {o.value === value && (
                  <span className="select-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
