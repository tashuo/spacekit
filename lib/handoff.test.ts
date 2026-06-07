import { describe, it, expect } from 'vitest'
import { encodeHandoff, decodeHandoff } from './handoff'

describe('handoff encode/decode', () => {
  it('round-trips ascii', () => {
    const p = decodeHandoff('#' + encodeHandoff('json-format', 'hello world'))
    expect(p).toEqual({ toolId: 'json-format', text: 'hello world' })
  })

  it('round-trips unicode and emoji', () => {
    const text = '你好 🌍 <a>&"'
    const p = decodeHandoff('#' + encodeHandoff('base64-decode', text))
    expect(p).toEqual({ toolId: 'base64-decode', text })
  })

  it('accepts hash without leading #', () => {
    const p = decodeHandoff(encodeHandoff('md5', 'x'))
    expect(p?.toolId).toBe('md5')
  })

  it('returns null on empty / missing toolId / garbage', () => {
    expect(decodeHandoff('')).toBeNull()
    expect(decodeHandoff('#x=abc')).toBeNull()
    expect(decodeHandoff('#t=md5&x=@@@not-base64@@@')).toBeNull()
  })

  it('clips text over the max length', () => {
    const big = 'a'.repeat(20000)
    const p = decodeHandoff('#' + encodeHandoff('sha', big))
    expect(p!.text.length).toBe(8192)
  })
})
