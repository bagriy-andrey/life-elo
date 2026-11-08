import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { withAuth } from './authTestUtils'

describe('App smoke render', () => {
  it('renders the auth screen without a session (no yesterday modal)', () => {
    const html = renderToString(withAuth(<App />))
    expect(html).toContain('Вход')
    expect(html).not.toContain('aria-modal="true"')
  })
})
