import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { FOCUSABLE, nextFocusTarget } from './focus'
import './BottomSheet.css'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  /**
   * Option rows: `<button className="sheet-option" aria-pressed={selected}>` with the label and,
   * when selected, a trailing `<span className="sheet-check">✓</span>`.
   */
  children: ReactNode
}

export function BottomSheet({ open, ...rest }: Props) {
  return open ? <SheetPanel {...rest} /> : null
}

function SheetPanel({ title, onClose, children }: Omit<Props, 'open'>) {
  const [opener] = useState(() => (typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)))
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    return () => {
      if (opener?.isConnected) opener.focus()
    }
  }, [opener])

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onCloseRef.current()
      return
    }
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
    const target = nextFocusTarget(items, document.activeElement as HTMLElement | null, panel, e.shiftKey)
    if (target) {
      e.preventDefault()
      target.focus()
    }
  }

  return (
    <div
      className="sheet-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current()
      }}
      onKeyDown={onKeyDown}
    >
      <div ref={panelRef} className="sheet-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <span className="sheet-grabber" aria-hidden="true" />
        <strong id={titleId} className="sheet-title">
          {title}
        </strong>
        <div className="sheet-content">{children}</div>
      </div>
    </div>
  )
}
