import { describe, it, expect } from 'vitest'
import { jsonToYaml, yamlToJson } from '@/lib/tools/convert'

describe('jsonToYaml', () => {
  it('converts a simple object', () => {
    expect(jsonToYaml('{"a":1}').output).toBe('a: 1\n')
  })
  it('errors on empty input', () => {
    expect(jsonToYaml('   ').ok).toBe(false)
  })
  it('errors on invalid JSON', () => {
    expect(jsonToYaml('x{').ok).toBe(false)
  })
})

describe('yamlToJson', () => {
  it('converts simple yaml to pretty JSON', () => {
    expect(yamlToJson('a: 1').output).toBe('{\n  "a": 1\n}')
  })
  it('errors on empty input', () => {
    expect(yamlToJson('   ').ok).toBe(false)
  })
})

describe('round-trip', () => {
  it('json -> yaml -> json preserves structure', () => {
    const json = '{"name":"Tom","tags":["x","y"],"n":2}'
    const y = jsonToYaml(json)
    expect(y.ok).toBe(true)
    expect(yamlToJson(y.output).output).toBe(
      '{\n  "name": "Tom",\n  "tags": [\n    "x",\n    "y"\n  ],\n  "n": 2\n}',
    )
  })
})
