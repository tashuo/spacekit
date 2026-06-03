import { describe, it, expect } from 'vitest'
import { dedupLines, sortLines, toUpper, toLower } from '@/lib/tools/text'

describe('dedupLines', () => {
  it('removes duplicate lines preserving first occurrence order', () => {
    expect(dedupLines('a\nb\na\nc\nb').output).toBe('a\nb\nc')
  })
})

describe('sortLines', () => {
  it('sorts ascending by default', () => {
    expect(sortLines('c\na\nb').output).toBe('a\nb\nc')
  })
  it('sorts descending with option', () => {
    expect(sortLines('a\nb\nc', { desc: true }).output).toBe('c\nb\na')
  })
})

describe('case', () => {
  it('to upper', () => {
    expect(toUpper('aB c').output).toBe('AB C')
  })
  it('to lower', () => {
    expect(toLower('aB C').output).toBe('ab c')
  })
})
