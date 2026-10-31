import type { ReactNode } from 'react'
import './Pill.css'

interface Props {
  tone?: 'pos' | 'neg'
  children: ReactNode
}

export function Pill({ tone = 'pos', children }: Props) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}
