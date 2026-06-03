import { describe, it, expect } from 'vitest'
import { jsonToXml, xmlToJson } from '@/lib/tools/xml'

describe('xmlToJson', () => {
  it('parses an element into JSON', () => {
    const r = xmlToJson('<root><a>1</a><b>hi</b></root>')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('"root"')
    expect(r.output).toContain('"a"')
    expect(r.output).toContain('"b"')
  })
  it('errors on empty input', () => {
    expect(xmlToJson('  ').ok).toBe(false)
  })
})

describe('jsonToXml', () => {
  it('builds XML from JSON', () => {
    const r = jsonToXml('{"root":{"a":1,"b":"hi"}}')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('<a>1</a>')
    expect(r.output).toContain('<b>hi</b>')
  })
  it('errors on invalid json', () => {
    expect(jsonToXml('x{').ok).toBe(false)
  })
})

describe('round-trip', () => {
  it('json -> xml -> json keeps the leaf value', () => {
    const xml = jsonToXml('{"root":{"a":"hi"}}').output
    expect(xmlToJson(xml).output).toContain('"hi"')
  })
})
