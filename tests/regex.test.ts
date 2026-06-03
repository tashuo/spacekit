import { describe, it, expect } from 'vitest'
import { testRegex } from '@/lib/tools/regex'

describe('testRegex', () => {
  it('finds all matches with index', () => {
    expect(testRegex('\\d+', 'g', 'a1b22c').matches).toEqual([
      { match: '1', index: 1, groups: [] },
      { match: '22', index: 3, groups: [] },
    ])
  })
  it('captures groups', () => {
    expect(testRegex('(a)(b)', 'g', 'ab').matches[0].groups).toEqual(['a', 'b'])
  })
  it('returns empty matches for empty pattern', () => {
    expect(testRegex('', '', 'abc').matches).toEqual([])
  })
  it('reports invalid regex', () => {
    const r = testRegex('(', '', 'x')
    expect(r.ok).toBe(false)
    expect(typeof r.error).toBe('string')
  })
  it('honors the i flag', () => {
    expect(testRegex('abc', 'i', 'ABC').matches.length).toBe(1)
  })
  it('reports unmatched optional groups as undefined', () => {
    expect(testRegex('(a)(b)?', '', 'a').matches[0].groups).toEqual(['a', undefined])
  })
})
