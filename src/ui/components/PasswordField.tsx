import type { ComponentProps } from 'react'
import { TextField } from './TextField'
import { cx } from './cx'
import './PasswordField.css'

type Props = Omit<ComponentProps<typeof TextField>, 'type' | 'trailing'> & {
  /** Controlled: true shows the password as plain text. */
  visible: boolean
  onToggleVisible: () => void
  /** Strength meter level; shown only when > 0 and there is no error. */
  strength?: 0 | 1 | 2 | 3
}

const LABELS = { 1: 'Слабый пароль', 2: 'Нормальный пароль', 3: 'Надёжный пароль' } as const

/** Password input with a show/hide toggle and an optional 3-segment strength meter. */
export function PasswordField({ visible, onToggleVisible, strength, error, className, ...field }: Props) {
  const level = strength === 1 || strength === 2 || strength === 3 ? strength : 0
  const tone = level === 3 ? 'pos' : level === 2 ? 'warn' : 'neg'
  const filled = level === 1 ? 1 : level
  return (
    <div className={cx('password-field', className)}>
      <TextField
        {...field}
        error={error}
        type={visible ? 'text' : 'password'}
        trailing={
          <button type="button" className="password-toggle" aria-pressed={visible} onClick={onToggleVisible}>
            {visible ? 'Скрыть' : 'Показать'}
          </button>
        }
      />
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
