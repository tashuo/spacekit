import { describe, it, expect } from 'vitest'
import { overlayTools, guessOverlayTool } from '@/lib/tools/overlay'

describe('guessOverlayTool', () => {
  it('detects a JWT', () => {
    expect(guessOverlayTool('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc')).toBe('jwt-decode')
  })
  it('detects 10- and 13-digit timestamps', () => {
    expect(guessOverlayTool('1700000000')).toBe('ts-to-date')
    expect(guessOverlayTool('1700000000000')).toBe('ts-to-date')
  })
  it('detects URL-encoded text', () => {
    expect(guessOverlayTool('a%20b%2Fc')).toBe('url-decode')
  })
  it('detects unicode escapes', () => {
    expect(guessOverlayTool('\\u4f60\\u597d')).toBe('unicode-decode')
  })
  it('detects JSON', () => {
    expect(guessOverlayTool('{"a":1}')).toBe('json-format')
    expect(guessOverlayTool('[1,2,3]')).toBe('json-format')
  })
  it('detects base64', () => {
    expect(guessOverlayTool('aGVsbG8gd29ybGQ=')).toBe('base64-decode')
  })
  it('falls back to json-format for plain words / empty', () => {
    expect(guessOverlayTool('hello')).toBe('json-format')
    expect(guessOverlayTool('   ')).toBe('json-format')
  })
  it('only returns ids that exist in the overlay tool set', () => {
    const ids = new Set(overlayTools().map((t) => t.id))
    for (const s of ['eyJa.b.c', '1700000000', 'a%20b', '\\u0041', '{}', 'aGVsbG8h', 'plain']) {
      expect(ids.has(guessOverlayTool(s))).toBe(true)
    }
  })
})
