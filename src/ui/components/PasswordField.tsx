import type { InputHTMLAttributes } from 'react'
import { Field } from './Field'
import { cx } from './cx'
import './PasswordField.css'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & {
  label: string
  /** Error text below the input; sets aria-invalid and hides the meter. */
  error?: string
  /** Controlled: true shows the password as plain text. */
  visible: boolean
  onToggleVisible: () => void
  /** Strength meter level; shown only when > 0 and there is no error. */
  strength?: 0 | 1 | 2 | 3
}

const LABELS = { 1: 'Слабый пароль', 2: 'Нормальный пароль', 3: 'Надёжный пароль' } as const

/** Password input with a show/hide toggle and an optional 3-segment strength meter. */
export function PasswordField({ visible, onToggleVisible, strength, error, className, label, ...input }: Props) {
  const level = strength === 1 || strength === 2 || strength === 3 ? strength : 0
  const tone = level === 3 ? 'pos' : level === 2 ? 'warn' : 'neg'
  const filled = level === 1 ? 1 : level
  return (
    <div className={cx('password-field', className)}>
      <Field
        label={label}
        error={error}
        trailing={
          <button type="button" className="password-toggle" aria-pressed={visible} onClick={onToggleVisible}>
            {visible ? 'Скрыть' : 'Показать'}
          </button>
        }
      >
        <input {...input} type={visible ? 'text' : 'password'} />
      </Field>
      {level > 0 && !error && (
        <div className="password-meter">
          <div className="password-meter-bars" aria-hidden="true">
            {[1, 2, 3].map(i => (
              <span key={i} className={cx('password-meter-bar', i <= filled && `is-${tone}`)} />
            ))}
          </div>
          <span className="password-meter-label">{LABELS[level as 1 | 2 | 3]}</span>
        </div>
      )}
    </div>
  )
}
