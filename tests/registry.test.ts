import { describe, it, expect } from 'vitest'
import { TOOLS, findTool, searchTools, overlayToolIds } from '@/lib/tools/registry'
import { overlayTools } from '@/lib/tools/overlay'
import type { ToolResult } from '@/lib/tools/types'

// 运行同步工具并断言其非异步（异步的格式化工具不在此测）
function runSync(id: string, input: string): ToolResult {
  const r = findTool(id)!.run!(input)
  if (r instanceof Promise) throw new Error(`${id} run is async`)
  return r
}

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
  it('searchTools matches English tool names', () => {
    expect(searchTools('format').some((t) => t.id === 'json-format')).toBe(true)
    expect(searchTools('uppercase').some((t) => t.id === 'text-upper')).toBe(true)
    expect(searchTools('struct').some((t) => t.id === 'json-to-go')).toBe(true)
  })
  it('registers password-generator with password layout and no run', () => {
    expect(findTool('password-generator')!.layout).toBe('password')
    expect(findTool('password-generator')!.run).toBeUndefined()
  })
  it('io tools run end-to-end', () => {
    expect(runSync('json-format', '{"a":1}').output).toBe('{\n  "a": 1\n}')
  })
  it('registers batch-2 io tools that run', () => {
    expect(runSync('json-to-yaml', '{"a":1}').output).toBe('a: 1\n')
    expect(runSync('text-dedup', 'a\na\nb').output).toBe('a\nb')
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
  it('overlay module exposes runnable tools and stays in sync with registry inOverlay flags', () => {
    const list = overlayTools()
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((t) => typeof t.run === 'function')).toBe(true)
    // 单一事实来源校验：overlay.ts 的 id 集合必须等于 registry 中 inOverlay 标记集合
    expect(new Set(list.map((t) => t.id))).toEqual(new Set(overlayToolIds()))
  })
  it('every overlay tool id exists in the registry as a runnable io tool', () => {
    for (const { id } of overlayTools()) {
      const def = findTool(id)
      expect(def?.layout).toBe('io')
      expect(typeof def?.run).toBe('function')
    }
  })
  it('overlay set covers the high-frequency decode/parse tools', () => {
    const ids = overlayTools().map((t) => t.id)
    expect(ids).toContain('json-format')
    expect(ids).toContain('base64-decode')
    expect(ids).toContain('jwt-decode')
    expect(ids).toContain('ts-to-date')
  })
  it('registers batch-3a io tools that run', () => {
    expect(runSync('json-to-csv', '[{"a":1}]').output).toBe('a\n1')
    expect(runSync('json-to-ts', '{"a":1}').output).toContain('interface Root')
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
  it('registers format tools that run asynchronously via dynamic import', async () => {
    for (const id of ['sql-format', 'sql-minify', 'css-format', 'css-minify', 'html-format', 'js-format', 'xml-format', 'xml-minify', 'yaml-format', 'json5-format', 'toml-format', 'markdown-format']) {
      expect(findTool(id)!.category).toBe('format')
    }
    const r = findTool('sql-format')!.run!('select 1')
    expect(r instanceof Promise).toBe(true)
    expect((await r).output).toContain('SELECT')
  })
  it('search finds format tools by name and keyword', () => {
    expect(searchTools('sql').some((t) => t.id === 'sql-format')).toBe(true)
    expect(searchTools('minify').some((t) => t.id === 'css-minify')).toBe(true)
    expect(searchTools('beautify').some((t) => t.id === 'js-format')).toBe(true)
    expect(searchTools('xml').some((t) => t.id === 'xml-format')).toBe(true)
    expect(searchTools('yaml').some((t) => t.id === 'yaml-format')).toBe(true)
    expect(searchTools('json5').some((t) => t.id === 'json5-format')).toBe(true)
    expect(searchTools('toml').some((t) => t.id === 'toml-format')).toBe(true)
    expect(searchTools('markdown').some((t) => t.id === 'markdown-format')).toBe(true)
  })
})
