import { describe, it, expect } from 'vitest'
import { canonicalizeJson } from '@/lib/tools/diff'

describe('canonicalizeJson', () => {
  it('sorts keys at the top level', () => {
    expect(canonicalizeJson('{"b":2,"a":1}').output).toBe('{\n  "a": 1,\n  "b": 2\n}')
  })
  it('sorts keys recursively', () => {
    expect(canonicalizeJson('{"z":{"b":1,"a":2}}').output).toBe(
      '{\n  "z": {\n    "a": 2,\n    "b": 1\n  }\n}',
    )
  })
  it('keeps array order', () => {
    expect(canonicalizeJson('[3,1,2]').output).toBe('[\n  3,\n  1,\n  2\n]')
  })
  it('errors on empty input', () => {
    expect(canonicalizeJson('  ').ok).toBe(false)
  })
  it('errors on invalid JSON', () => {
    expect(canonicalizeJson('x').ok).toBe(false)
  })
})
