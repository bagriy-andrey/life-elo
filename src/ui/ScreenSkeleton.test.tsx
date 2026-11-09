import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { I18nProvider } from '../i18n'
import { ScreenSkeleton } from './ScreenSkeleton'

describe('ScreenSkeleton', () => {
  it.each(['home', 'review', 'habits', 'profile'] as const)('renders a busy placeholder for %s', (tab) => {
    const html = renderToString(
      <I18nProvider>
        <ScreenSkeleton tab={tab} />
      </I18nProvider>,
    )
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('skeleton')
  })
})
