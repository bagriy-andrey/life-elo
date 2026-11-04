import type { CSSProperties } from 'react'
import { initials } from '../../domain/profile'
import { cx } from './cx'
import './Avatar.css'

interface Props {
  /** Photo URL / data URL. Initials of `name` are shown when absent. */
  src?: string
  name: string
  /** Diameter in px. */
  size?: number
  /** Makes the avatar a button (edit mode), with a dashed border. */
  onClick?: () => void
  /** Accessible name of the button, e.g. "Выбрать фото". Only used with onClick. */
  label?: string
  className?: string
}

export function Avatar({ src, name, size = 96, onClick, label, className }: Props) {
  const style = { '--avatar-size': `${size}px` } as CSSProperties
  const content = src ? <img src={src} alt="" /> : initials(name)
  if (onClick) {
    return (
      <button type="button" className={cx('avatar avatar-button', className)} style={style} onClick={onClick} aria-label={label}>
        {content}
      </button>
    )
  }
  return (
    <span className={cx('avatar', className)} style={style}>
      {content}
    </span>
  )
}
