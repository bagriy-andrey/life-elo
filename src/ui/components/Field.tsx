import { Children, cloneElement, isValidElement, useId } from 'react'
import type { ReactElement, ReactNode } from 'react'
import { cx } from './cx'
import './Field.css'

interface Props {
  label: string
  /** Shows a red asterisk after the label. */
  required?: boolean
  /** Short text inside the control's left edge, e.g. "@". */
  prefix?: string
  /** Muted helper text; hidden while an error is shown. */
  hint?: string
  /** Error text under the control. The control itself should get aria-invalid. */
  error?: string
  className?: string
  /** A single native control, e.g. <input>. It receives aria-describedby. */
  children: ReactNode
}

export function Field({ label, required, prefix, hint, error, className, children }: Props) {
  const noteId = useId()
  const note = error || hint
  const child = Children.only(children)
  const control = isValidElement(child)
    ? cloneElement(child as ReactElement<{ 'aria-describedby'?: string }>, {
        'aria-describedby': note ? noteId : undefined,
      })
    : child
  return (
    <label className={cx('field', className)}>
      <span className="field-label">
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </span>
      <span className={cx('field-control', prefix && 'field-has-prefix')}>
        {prefix && <span className="field-prefix" aria-hidden="true">{prefix}</span>}
        {control}
      </span>
      {note && (
        <span id={noteId} className={error ? 'field-error' : 'field-hint'}>
          {note}
        </span>
      )}
    </label>
  )
}
