import { describe, it, expect } from 'vitest'
import { formatJson, minifyJson, escapeJson, unescapeJson } from '@/lib/tools/json'

describe('formatJson', () => {
  it('pretty-prints with 2 spaces', () => {
    const r = formatJson('{"a":1,"b":[2,3]}')
    expect(r.ok).toBe(true)
    expect(r.output).toBe('{\n  "a": 1,\n  "b": [\n    2,\n    3\n  ]\n}')
  })
  it('reports line/column on invalid JSON', () => {
    const r = formatJson('{"a":}')
    expect(r.ok).toBe(false)
    expect(r.error?.line).toBe(1)
    expect(typeof r.error?.column).toBe('number')
  })
  it('errors on empty input', () => {
    expect(formatJson('   ').ok).toBe(false)
  })
})

describe('minifyJson', () => {
  it('removes whitespace', () => {
    expect(minifyJson('{ "a": 1 }').output).toBe('{"a":1}')
  })
})

describe('escape/unescape', () => {
  it('escapes to a JSON string literal body', () => {
    expect(escapeJson('a"b\n').output).toBe('a\\"b\\n')
  })
  it('unescapes back', () => {
    expect(unescapeJson('a\\"b\\n').output).toBe('a"b\n')
  })
})
