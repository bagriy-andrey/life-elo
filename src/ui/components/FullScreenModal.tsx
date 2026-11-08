import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { FOCUSABLE, nextFocusTarget } from './focus'
import './FullScreenModal.css'

interface Props {
  /** Accessible name of the dialog (aria-label). */
  label: string
  /** Modal content. It has no built-in close control: the caller unmounts it. */
  children: ReactNode
}

export function FullScreenModal({ label, children }: Props) {
  // Lazy initializer runs during render, before children's autoFocus fires in commit.
  const [opener] = useState(() => (typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)))
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el && !el.contains(document.activeElement)) el.focus()
    return () => {
      if (opener?.isConnected) opener.focus()
    }
  }, [opener])

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    // Esc is deliberately ignored: the flow is mandatory.
    if (e.key !== 'Tab') return
    const el = ref.current
    if (!el) return
    const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
    const target = nextFocusTarget(items, document.activeElement as HTMLElement | null, el, e.shiftKey)
    if (target) {
      e.preventDefault()
      target.focus()
    }
  }

  return (
    <div ref={ref} className="fullscreen-modal" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} onKeyDown={onKeyDown}>
      {children}
    </div>
  )
}
