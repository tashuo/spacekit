import { describe, it, expect } from 'vitest'
import { jsonToCsv } from '@/lib/tools/csv'

describe('jsonToCsv', () => {
  it('converts an array of objects', () => {
    expect(jsonToCsv('[{"a":1,"b":2},{"a":3,"b":4}]').output).toBe('a,b\n1,2\n3,4')
  })
  it('unions keys across rows (first-seen order)', () => {
    expect(jsonToCsv('[{"a":1},{"b":2}]').output).toBe('a,b\n1,\n,2')
  })
  it('quotes values containing comma/quote/newline', () => {
    expect(jsonToCsv('[{"a":"x,y"}]').output).toBe('a\n"x,y"')
    expect(jsonToCsv('[{"a":"he said \\"hi\\""}]').output).toBe('a\n"he said ""hi"""')
  })
  it('errors when top-level is not an array', () => {
    expect(jsonToCsv('{"a":1}').ok).toBe(false)
  })
  it('errors when an element is not an object', () => {
    expect(jsonToCsv('[1,2]').ok).toBe(false)
  })
  it('quotes values containing a carriage return', () => {
    // JSON 源里的 \r 转义解析出真实 CR；CSV 应加引号
    const out = jsonToCsv('[{"a":"x\\ry"}]').output
    expect(out).toBe('a\n"x\ry"')
  })
})
