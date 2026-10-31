import type { HTMLAttributes } from 'react'
import { cx } from './cx'
import './Card.css'

interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Dimmed, e.g. a paused habit. */
  inactive?: boolean
}

export function Card({ inactive, className, ...rest }: Props) {
  return <div {...rest} className={cx('card', inactive && 'card-inactive', className)} />
}
