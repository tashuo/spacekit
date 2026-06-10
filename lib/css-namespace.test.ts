import { describe, it, expect } from 'vitest'
import { namespaceTailwindVars } from './css-namespace'

describe('namespaceTailwindVars', () => {
  it('renames @property declarations', () => {
    expect(namespaceTailwindVars('@property --tw-gradient-from{syntax:"<color>"}')).toBe(
      '@property --sk-tw-gradient-from{syntax:"<color>"}',
    )
  })

  it('renames assignments and var() references consistently', () => {
    const input = '.x{--tw-shadow:0 1px 2px;box-shadow:var(--tw-shadow)}'
    expect(namespaceTailwindVars(input)).toBe(
      '.x{--sk-tw-shadow:0 1px 2px;box-shadow:var(--sk-tw-shadow)}',
    )
  })

  it('leaves non-tw custom properties untouched', () => {
    const input = ':root{--ck-fg:#fff;--font-sans:system-ui}'
    expect(namespaceTailwindVars(input)).toBe(input)
  })

  it('leaves no --tw- token after transform', () => {
    const out = namespaceTailwindVars('@property --tw-x{} .a{color:var(--tw-y)}')
    expect(out.includes('--tw-')).toBe(false)
  })
})
