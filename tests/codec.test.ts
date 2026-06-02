import { describe, it, expect } from 'vitest'
import {
  encodeBase64, decodeBase64, encodeUrl, decodeUrl, encodeUnicode, decodeUnicode,
} from '@/lib/tools/codec'

describe('base64 (utf-8 safe)', () => {
  it('round-trips unicode', () => {
    const e = encodeBase64('你好 hi')
    expect(e.ok).toBe(true)
    expect(decodeBase64(e.output).output).toBe('你好 hi')
  })
  it('errors on invalid base64', () => {
    expect(decodeBase64('!!!!').ok).toBe(false)
  })
})

describe('url', () => {
  it('encodes and decodes components', () => {
    expect(encodeUrl('a b&c=中').output).toBe('a%20b%26c%3D%E4%B8%AD')
    expect(decodeUrl('a%20b%26c%3D%E4%B8%AD').output).toBe('a b&c=中')
  })
})

describe('unicode \\uXXXX', () => {
  it('encodes non-ascii to \\uXXXX', () => {
    expect(encodeUnicode('A中').output).toBe('A\\u4e2d')
  })
  it('decodes back', () => {
    expect(decodeUnicode('A\\u4e2d').output).toBe('A中')
  })
})
