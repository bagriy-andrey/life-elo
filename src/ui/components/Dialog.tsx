import { useEffect, useId, useRef, useState } from 'react'
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

export function Dialog({ open, ...rest }: Props) {
  return open ? <DialogPanel {...rest} /> : null
}

function DialogPanel({ title, onClose, children }: Omit<Props, 'open'>) {
  // Lazy initializer runs during render, before any child's autoFocus fires in commit.
  const [opener] = useState(() => document.activeElement as HTMLElement | null)
  const titleId = useId()
  const contentId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const panel = panelRef.current
    // A child may claim focus itself via autoFocus (e.g. the safe "Cancel" action).
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
    <div className="dialog-overlay" onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current()
      }}
      onKeyDown={onKeyDown}>
      <div
        ref={panelRef}
        className="dialog-panel"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={contentId}
        tabIndex={-1}
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
