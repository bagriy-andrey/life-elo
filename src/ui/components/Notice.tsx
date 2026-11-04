import type { ReactNode } from 'react'
import './Notice.css'

interface Props {
  tone: 'success' | 'error'
  children: ReactNode
}

/** Inline status message: success (role=status) or error (role=alert). */
export function Notice({ tone, children }: Props) {
  return (
    <div className={`notice notice-${tone}`} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}
