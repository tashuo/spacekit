import { describe, it, expect } from 'vitest'
import { tsToDate, dateToTs } from '@/lib/tools/timestamp'

describe('tsToDate', () => {
  it('parses seconds (10 digits) as UTC ISO', () => {
    // 1700000000 = 2023-11-14T22:13:20Z
    expect(tsToDate('1700000000', { unit: 'auto', tz: 'UTC' }).output).toBe(
      '2023-11-14 22:13:20',
    )
  })
  it('parses milliseconds (13 digits)', () => {
    expect(tsToDate('1700000000000', { unit: 'auto', tz: 'UTC' }).output).toBe(
      '2023-11-14 22:13:20',
    )
  })
  it('errors on non-numeric', () => {
    expect(tsToDate('abc', { unit: 'auto', tz: 'UTC' }).ok).toBe(false)
  })
})

describe('dateToTs', () => {
  it('converts UTC date string to seconds', () => {
    expect(dateToTs('2023-11-14 22:13:20', { tz: 'UTC' }).output).toBe('1700000000')
  })
})
