import { describe, it, expect } from 'vitest'
import { md5, sha } from '@/lib/tools/hash'

describe('md5', () => {
  it('hashes empty string', () => {
    expect(md5('').output).toBe('d41d8cd98f00b204e9800998ecf8427e')
  })
  it('hashes abc', () => {
    expect(md5('abc').output).toBe('900150983cd24fb0d6963f7d28e17f72')
  })
})

describe('sha', () => {
  it('sha-256 of abc', async () => {
    const r = await sha('abc', 'SHA-256')
    expect(r.output).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})
