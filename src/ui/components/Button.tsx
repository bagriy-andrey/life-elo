import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'
import { Spinner } from './Spinner'
import './Button.css'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'quiet'
  /** Shows a spinner over the (hidden, still sized) label and disables the button: no width jump. */
  loading?: boolean
}

export function Button({ variant = 'default', loading, className, disabled, children, ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx('btn', variant !== 'default' && `btn-${variant}`, loading && 'btn-loading', className)}
    >
      {loading ? (
        <>
          <span className="btn-label">{children}</span>
          <Spinner className="btn-spinner" />
        </>
      ) : (
        children
      )}
    </button>
  )
}
