import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PasswordField } from './PasswordField'

const noop = () => {}
const labels = { showLabel: 'Показать', hideLabel: 'Скрыть', strengthLabels: ['Слабый пароль', 'Нормальный пароль', 'Надёжный пароль'] } as const

describe('PasswordField', () => {
  it('renders toggle text, meter label and masks by default', () => {
    const html = renderToString(
      <PasswordField label="Пароль" visible={false} onToggleVisible={noop} {...labels} strength={2} />,
    )
    expect(html).toContain('Показать')
    expect(html).toContain('type="password"')
    expect(html).toContain('Нормальный пароль')
    expect(html).not.toContain('aria-invalid')
  })

  it('shows plain text and hides the meter with error + aria-invalid', () => {
    const html = renderToString(
      <PasswordField label="Пароль" visible onToggleVisible={noop} {...labels} strength={3} error="Слишком короткий" />,
    )
    expect(html).toContain('Скрыть')
    expect(html).toContain('type="text"')
    expect(html).toContain('aria-invalid="true"')
    expect(html).toContain('Слишком короткий')
    expect(html).not.toContain('Надёжный пароль')
  })
})
