import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { idbKv } from './kv'

describe('idbKv', () => {
  it('round-trips a value', async () => {
    await idbKv.set('k1', { a: 1, b: 'two' })
    const v = await idbKv.get<{ a: number; b: string }>('k1')
    expect(v).toEqual({ a: 1, b: 'two' })
  })

  it('returns undefined for a missing key', async () => {
    const v = await idbKv.get('missing')
    expect(v).toBeUndefined()
  })

  it('removes a value', async () => {
    await idbKv.set('k2', 42)
    await idbKv.remove('k2')
    const v = await idbKv.get('k2')
    expect(v).toBeUndefined()
  })
})
