import { describe, it, expect } from 'vitest'
import { generateRandom, generatePin, generateMemorable, estimateStrength } from '@/lib/tools/password'

const opts = (o: Partial<Parameters<typeof generateRandom>[0]> = {}) => ({
  length: 16,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: false,
  ...o,
})

describe('generateRandom', () => {
  it('respects length', () => {
    expect(generateRandom(opts({ length: 20 })).length).toBe(20)
  })
  it('only uses selected sets (digits only)', () => {
    const pw = generateRandom(opts({ length: 30, lower: false, upper: false, symbols: false }))
    expect(/^[0-9]+$/.test(pw)).toBe(true)
  })
  it('includes at least one of each selected set', () => {
    const pw = generateRandom(opts({ length: 12 }))
    expect(/[a-z]/.test(pw)).toBe(true)
    expect(/[A-Z]/.test(pw)).toBe(true)
    expect(/[0-9]/.test(pw)).toBe(true)
    expect(/[^a-zA-Z0-9]/.test(pw)).toBe(true)
  })
  it('avoids ambiguous characters when asked', () => {
    const pw = generateRandom(opts({ length: 200, symbols: false, avoidAmbiguous: true }))
    expect(/[0O1lI]/.test(pw)).toBe(false)
  })
  it('returns empty when no set selected', () => {
    expect(generateRandom(opts({ lower: false, upper: false, digits: false, symbols: false }))).toBe('')
  })
  it('produces different output each call', () => {
    expect(generateRandom(opts({ length: 24 }))).not.toBe(generateRandom(opts({ length: 24 })))
  })
})

describe('generatePin', () => {
  it('is all digits with the given length', () => {
    const pin = generatePin(6)
    expect(/^[0-9]{6}$/.test(pin)).toBe(true)
  })
})

describe('generateMemorable', () => {
  it('joins the requested number of words', () => {
    const pw = generateMemorable({ words: 4, separator: '-', capitalize: false, includeNumber: false })
    expect(pw.split('-').length).toBe(4)
  })
  it('capitalizes and appends a number when requested', () => {
    const parts = generateMemorable({ words: 3, separator: '-', capitalize: true, includeNumber: true }).split('-')
    expect(parts.length).toBe(4)
    expect(/^[A-Z]/.test(parts[0])).toBe(true)
    expect(/^[0-9]+$/.test(parts[3])).toBe(true)
  })
})

describe('estimateStrength', () => {
  it('rates a long complex password highly', () => {
    expect(estimateStrength('aB3$xY9!kL2@mN5#').label).toBe('excellent')
  })
  it('rates a short simple one as weak', () => {
    expect(estimateStrength('abc').label).toBe('weak')
  })
  it('empty has zero bits', () => {
    expect(estimateStrength('').bits).toBe(0)
  })
})
