import { describe, it, expect } from 'vitest'
import { decodeJwt } from '@/lib/tools/jwt'

// header {"alg":"HS256","typ":"JWT"} . payload {"sub":"123","name":"Tom"} . sig
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoiVG9tIn0.abc'

describe('decodeJwt', () => {
  it('decodes header and payload as pretty JSON', () => {
    const r = decodeJwt(TOKEN)
    expect(r.ok).toBe(true)
    expect(r.output).toContain('"alg": "HS256"')
    expect(r.output).toContain('"name": "Tom"')
  })
  it('errors when not three segments', () => {
    expect(decodeJwt('a.b').ok).toBe(false)
  })
})
