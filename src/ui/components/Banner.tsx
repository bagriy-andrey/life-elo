import type { ReactNode } from 'react'
import './Card.css'
import './Banner.css'

interface Props {
  title: ReactNode
  subtitle?: ReactNode
  onClick: () => void
}

/** Tappable call-to-action card. */
export function Banner({ title, subtitle, onClick }: Props) {
  return (
    <button className="card banner" onClick={onClick}>
      <strong>{title}</strong>
      {subtitle && <span className="muted">{subtitle}</span>}
    </button>
  )
}
