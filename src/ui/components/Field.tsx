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
  /** Error text under the control. The control gets aria-invalid automatically. */
  error?: string
  /** Node inside the control's right edge, e.g. a show/hide button (adds right padding to the input). */
  trailing?: ReactNode
  className?: string
  /** A single native control, e.g. <input>. It receives id, aria-describedby and aria-invalid. */
  children: ReactNode
}

export function Field({ label, required, prefix, hint, error, trailing, className, children }: Props) {
  const autoId = useId()
  const noteId = useId()
  const note = error || hint
  const child = Children.only(children)
  type ControlProps = { id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }
  const childId = isValidElement(child) ? (child.props as ControlProps).id : undefined
  const id = childId ?? autoId
  const control = isValidElement(child)
    ? cloneElement(child as ReactElement<ControlProps>, {
        id,
        'aria-describedby': note ? noteId : undefined,
        'aria-invalid': error ? true : undefined,
      })
    : child
  return (
    <div className={cx('field', className)}>
      <label className="field-label" htmlFor={id}>
        {label}
        {required && <span className="field-required" aria-hidden="true"> *</span>}
      </label>
      <span className={cx('field-control', prefix && 'field-has-prefix', !!trailing && 'field-has-trailing')}>
        {prefix && <span className="field-prefix" aria-hidden="true">{prefix}</span>}
        {control}
        {trailing && <span className="field-trailing">{trailing}</span>}
      </span>
      {note && (
        <span id={noteId} className={error ? 'field-error' : 'field-hint'}>
          {note}
        </span>
      )}
    </div>
  )
}
