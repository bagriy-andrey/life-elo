import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { FOCUSABLE, nextFocusTarget } from './focus'
import './BottomSheet.css'

interface Props {
  /** Renders nothing when false. */
  open: boolean
  /** Heading in the sheet header; also the accessible name (aria-labelledby). */
  title: string
  /** Called on Escape, overlay click and the close button. */
  onClose: () => void
  /** Accessible name of the round close button (the component has no built-in language). */
  closeLabel: string
  /** Sticky footer under the scrollable body (e.g. the primary action); hidden when omitted. */
  footer?: ReactNode
  /** Scrollable sheet body. */
  children: ReactNode
}

export function BottomSheet({ open, ...rest }: Props) {
  return open ? <SheetPanel {...rest} /> : null
}

function SheetPanel({ title, onClose, closeLabel, footer, children }: Omit<Props, 'open'>) {
  // Lazy initializer runs during render, before children's autoFocus fires in commit.
  const [opener] = useState(() => (typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null)))
  const titleId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const el = ref.current
    if (el && !el.contains(document.activeElement)) el.focus()
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
    <div
      className="bottom-sheet-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCloseRef.current()
      }}
      onKeyDown={onKeyDown}
    >
      <div ref={ref} className="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="bottom-sheet-header">
          <span className="bottom-sheet-handle" aria-hidden="true" />
          <div className="bottom-sheet-titlebar">
            <strong id={titleId} className="bottom-sheet-title">
              {title}
            </strong>
            <button type="button" className="bottom-sheet-close" aria-label={closeLabel} onClick={() => onCloseRef.current()}>
              ✕
            </button>
          </div>
        </div>
        <div className="bottom-sheet-body">{children}</div>
        {footer ? <div className="bottom-sheet-footer">{footer}</div> : null}
      </div>
    </div>
  )
}
