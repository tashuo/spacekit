import { describe, it, expect } from 'vitest'
import { queryJsonPath } from '@/lib/tools/jsonpath'

describe('queryJsonPath', () => {
  it('returns matched values as a JSON array', () => {
    expect(queryJsonPath('{"a":{"b":[1,2,3]}}', '$.a.b[*]').output).toBe('[\n  1,\n  2,\n  3\n]')
  })
  it('returns a single match wrapped in an array', () => {
    expect(queryJsonPath('{"a":1}', '$.a').output).toBe('[\n  1\n]')
  })
  it('errors on empty json', () => {
    expect(queryJsonPath('  ', '$').ok).toBe(false)
  })
  it('errors on empty path', () => {
    expect(queryJsonPath('{"a":1}', '  ').ok).toBe(false)
  })
  it('errors on invalid json', () => {
    expect(queryJsonPath('x{', '$').ok).toBe(false)
  })
})
