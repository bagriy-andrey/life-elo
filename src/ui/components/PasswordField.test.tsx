import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PasswordField } from './PasswordField'

const noop = () => {}

describe('PasswordField', () => {
  it('renders toggle text, meter label and masks by default', () => {
    const html = renderToString(
      <PasswordField label="Пароль" visible={false} onToggleVisible={noop} strength={2} />,
    )
    expect(html).toContain('Показать')
    expect(html).toContain('type="password"')
    expect(html).toContain('Нормальный пароль')
    expect(html).not.toContain('aria-invalid')
  })

  it('shows plain text and hides the meter with error + aria-invalid', () => {
    const html = renderToString(
      <PasswordField label="Пароль" visible onToggleVisible={noop} strength={3} error="Слишком короткий" />,
    )
    expect(html).toContain('Скрыть')
    expect(html).toContain('type="text"')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('Слишком короткий')
    expect(html).not.toContain('Надёжный пароль')
  })
})
