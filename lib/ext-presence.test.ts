import { describe, it, expect } from 'vitest'
import { isPing, isPresenceReply, shouldPromptInstall } from './ext-presence'

describe('isPing / isPresenceReply', () => {
  it('matches correct shapes', () => {
    expect(isPing({ source: 'spacekit-web', type: 'ping' })).toBe(true)
    expect(isPresenceReply({ source: 'spacekit-ext', type: 'present' })).toBe(true)
  })
  it('rejects wrong source/type/non-object', () => {
    expect(isPing({ source: 'spacekit-ext', type: 'ping' })).toBe(false)
    expect(isPresenceReply({ source: 'spacekit-ext', type: 'ping' })).toBe(false)
    expect(isPing(null)).toBe(false)
    expect(isPresenceReply('present')).toBe(false)
  })
})

describe('shouldPromptInstall', () => {
  const base = { inExtension: false, isChromium: true, hasStoreUrl: true, detected: false }
  it('true only when all conditions met', () => {
    expect(shouldPromptInstall(base)).toBe(true)
  })
  it('false if any condition flips', () => {
    expect(shouldPromptInstall({ ...base, inExtension: true })).toBe(false)
    expect(shouldPromptInstall({ ...base, isChromium: false })).toBe(false)
    expect(shouldPromptInstall({ ...base, hasStoreUrl: false })).toBe(false)
    expect(shouldPromptInstall({ ...base, detected: true })).toBe(false)
  })
})
