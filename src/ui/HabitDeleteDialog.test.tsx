import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Habit } from '../domain/types'
import { I18nProvider } from '../i18n'
import { HabitDeleteDialog } from './HabitDeleteDialog'

const habit = { id: 'h1', name: 'Бег' } as unknown as Habit

const render = (h: Habit | undefined) =>
  renderToString(
    <I18nProvider>
      <HabitDeleteDialog habit={h} onClose={() => {}} onDeleted={() => {}} />
    </I18nProvider>,
  )

describe('HabitDeleteDialog smoke render', () => {
  beforeEach(() => {
    vi.stubGlobal('document', { activeElement: null })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows title with name, text and both buttons', () => {
    const html = render(habit)
    expect(html).toContain('Удалить «Бег»?')
    expect(html).toContain('Вся история отметок')
    expect(html).toContain('Отмена')
    expect(html).toContain('danger')
  })

  it('renders nothing when closed', () => {
    expect(render(undefined)).toBe('')
  })
})
