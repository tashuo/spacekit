import { describe, it, expect } from 'vitest'
import { generateQrSvg } from '@/lib/tools/qr'

describe('generateQrSvg', () => {
  it('produces an svg string for text', async () => {
    const r = await generateQrSvg('https://example.com')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('<svg')
  })
  it('errors on empty input', async () => {
    expect((await generateQrSvg('   ')).ok).toBe(false)
  })
})
