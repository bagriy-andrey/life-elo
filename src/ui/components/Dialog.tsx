import { useEffect, useId, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import './Dialog.css'

interface Props {
  open: boolean
  title: string
  onClose: () => void
  /** Body text (`<p className="dialog-body">`) and actions (`<div className="dialog-actions">`). */
  children: ReactNode
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Dialog({ open, title, onClose, children }: Props) {
  const titleId = useId()
  const contentId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    // A child may claim focus itself via autoFocus (e.g. the safe "Cancel" action).
    if (panel && !panel.contains(document.activeElement)) panel.focus()
    return () => previous?.focus?.()
  }, [open])

  if (!open) return null

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onCloseRef.current()
      return
    }
    if (e.key !== 'Tab') return
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === panelRef.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="dialog-overlay" onClick={onClose} onKeyDown={onKeyDown}>
      <div
        ref={panelRef}
        className="dialog-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={contentId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <strong id={titleId} className="dialog-title">
          {title}
        </strong>
        <div id={contentId} className="dialog-content">
          {children}
        </div>
      </div>
    </div>
  )
}
