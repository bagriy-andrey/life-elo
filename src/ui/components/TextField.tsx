import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import { cx } from './cx'
import './TextField.css'

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: ReactNode
  /** Error text shown below the input; also sets aria-invalid. */
  error?: ReactNode
  /** Node placed inside the input on the right (e.g. a show/hide toggle). */
  trailing?: ReactNode
}

/** Labelled text input with optional error text and trailing slot. */
export function TextField({ label, error, trailing, className, ...input }: Props) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div className={cx('text-field', className)}>
      <label htmlFor={id} className="text-field-label">{label}</label>
      <div className="text-field-control">
        <input
          {...input}
          id={id}
          className={cx('text-field-input', !!trailing && 'has-trailing')}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        {trailing && <div className="text-field-trailing">{trailing}</div>}
      </div>
      {error && <span id={errorId} className="text-field-error">{error}</span>}
    </div>
  )
}
