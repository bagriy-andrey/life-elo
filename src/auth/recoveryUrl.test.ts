import { describe, expect, it } from 'vitest'
import { parseRecoveryUrl, stripRecoveryParams } from './recoveryUrl'

describe('parseRecoveryUrl', () => {
  it('parses type and token_hash', () => {
    expect(parseRecoveryUrl('?type=recovery&token_hash=abc123')).toEqual({ tokenHash: 'abc123' })
  })
  it('rejects other types or missing hash', () => {
    expect(parseRecoveryUrl('?type=signup&token_hash=abc')).toBeNull()
    expect(parseRecoveryUrl('?type=recovery')).toBeNull()
    expect(parseRecoveryUrl('')).toBeNull()
  })
})

describe('stripRecoveryParams', () => {
  it('removes only recovery params', () => {
    expect(stripRecoveryParams('https://x.app/?type=recovery&token_hash=a&keep=1#h')).toBe('/?keep=1#h')
    expect(stripRecoveryParams('https://x.app/?type=recovery&token_hash=a')).toBe('/')
  })
})
