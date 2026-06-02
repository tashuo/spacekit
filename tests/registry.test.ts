import { describe, it, expect } from 'vitest'
import { TOOLS, findTool, searchTools } from '@/lib/tools/registry'

describe('registry', () => {
  it('every tool has a unique id', () => {
    const ids = TOOLS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('findTool returns the matching def', () => {
    expect(findTool('json-format')?.category).toBe('json')
  })
  it('searchTools matches name and keywords', () => {
    expect(searchTools('base64').some((t) => t.id === 'base64-encode')).toBe(true)
    expect(searchTools('格式化').some((t) => t.id === 'json-format')).toBe(true)
  })
  it('io tools run end-to-end', () => {
    expect(findTool('json-format')!.run!('{"a":1}').output).toBe('{\n  "a": 1\n}')
  })
})
