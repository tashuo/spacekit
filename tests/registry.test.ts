import { describe, it, expect } from 'vitest'
import { TOOLS, findTool, searchTools, overlayTools } from '@/lib/tools/registry'

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
  it('registers batch-2 io tools that run', () => {
    expect(findTool('json-to-yaml')!.run!('{"a":1}').output).toBe('a: 1\n')
    expect(findTool('text-dedup')!.run!('a\na\nb').output).toBe('a\nb')
  })
  it('registers diff/regex tools with the right layout and no run', () => {
    expect(findTool('json-diff')!.layout).toBe('diff')
    expect(findTool('json-diff')!.run).toBeUndefined()
    expect(findTool('regex-test')!.layout).toBe('regex')
    expect(findTool('regex-test')!.run).toBeUndefined()
  })
  it('search finds batch-2 tools', () => {
    expect(searchTools('yaml').some((t) => t.id === 'json-to-yaml')).toBe(true)
    expect(searchTools('正则').some((t) => t.id === 'regex-test')).toBe(true)
  })
  it('overlayTools returns only tools flagged inOverlay, all runnable io tools', () => {
    const list = overlayTools()
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((t) => t.inOverlay === true)).toBe(true)
    expect(list.every((t) => t.layout === 'io' && typeof t.run === 'function')).toBe(true)
  })
  it('overlay set covers the high-frequency decode/parse tools', () => {
    const ids = overlayTools().map((t) => t.id)
    expect(ids).toContain('json-format')
    expect(ids).toContain('base64-decode')
    expect(ids).toContain('jwt-decode')
    expect(ids).toContain('ts-to-date')
  })
  it('registers batch-3a io tools that run', () => {
    expect(findTool('json-to-csv')!.run!('[{"a":1}]').output).toBe('a\n1')
    expect(findTool('json-to-ts')!.run!('{"a":1}').output).toContain('interface Root')
  })
  it('registers jsonpath-query with query layout and no run', () => {
    expect(findTool('jsonpath-query')!.layout).toBe('query')
    expect(findTool('jsonpath-query')!.run).toBeUndefined()
  })
  it('search finds batch-3a tools', () => {
    expect(searchTools('xml').some((t) => t.id === 'json-to-xml')).toBe(true)
    expect(searchTools('jsonpath').some((t) => t.id === 'jsonpath-query')).toBe(true)
  })
  it('registers sm3 as an io tool', () => {
    expect(findTool('sm3')!.layout).toBe('io')
    expect(typeof findTool('sm3')!.run).toBe('function')
  })
  it('registers symmetric crypto tools with crypto layout and no run', () => {
    for (const id of ['aes', 'des', 'triple-des', 'sm4']) {
      expect(findTool(id)!.layout).toBe('crypto')
      expect(findTool(id)!.run).toBeUndefined()
    }
  })
  it('registers qr tools with qrcode layout and no run', () => {
    for (const id of ['qr-generate', 'qr-decode']) {
      expect(findTool(id)!.layout).toBe('qrcode')
      expect(findTool(id)!.run).toBeUndefined()
    }
  })
})
