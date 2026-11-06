import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'
import './Button.css'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'quiet'
}

export function Button({ variant = 'default', className, ...rest }: Props) {
  return <button {...rest} className={cx('btn', variant !== 'default' && `btn-${variant}`, className)} />
}
