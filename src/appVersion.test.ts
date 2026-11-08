import { describe, expect, it } from 'vitest'
import pkg from '../package.json'
import { APP_VERSION } from './appVersion'

describe('APP_VERSION', () => {
  it('matches package.json (injected by the Vite define) or falls back to dev', () => {
    expect([pkg.version, 'dev']).toContain(APP_VERSION)
  })
})
