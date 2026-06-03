import { describe, it, expect } from 'vitest'
import { jsonToTs, jsonToGo, jsonToJava } from '@/lib/tools/codegen'

const JSON_SRC = '{"name":"Tom","age":3,"active":true,"tags":["a","b"],"addr":{"city":"X"}}'

describe('jsonToTs', () => {
  it('generates interfaces with inferred field types', () => {
    const out = jsonToTs(JSON_SRC).output
    expect(out).toContain('interface Root {')
    expect(out).toContain('name: string')
    expect(out).toContain('age: number')
    expect(out).toContain('active: boolean')
    expect(out).toContain('tags: string[]')
    expect(out).toContain('addr: Addr')
    expect(out).toContain('interface Addr {')
    expect(out).toContain('city: string')
  })
  it('errors when top-level is not an object', () => {
    expect(jsonToTs('[1,2]').ok).toBe(false)
  })
})

describe('jsonToGo', () => {
  it('generates a struct with json tags', () => {
    const out = jsonToGo(JSON_SRC).output
    expect(out).toContain('type Root struct {')
    expect(out).toContain('Name string `json:"name"`')
    expect(out).toContain('Age int `json:"age"`')
    expect(out).toContain('Tags []string `json:"tags"`')
    expect(out).toContain('Addr Addr `json:"addr"`')
  })
})

describe('jsonToJava', () => {
  it('generates a class with typed fields', () => {
    const out = jsonToJava(JSON_SRC).output
    expect(out).toContain('class Root {')
    expect(out).toContain('String name;')
    expect(out).toContain('int age;')
    expect(out).toContain('List<String> tags;')
    expect(out).toContain('Addr addr;')
  })
})

describe('codegen edge cases', () => {
  it('disambiguates same-named nested objects with different shapes', () => {
    const out = jsonToTs('{"a":{"config":{"x":1}},"b":{"config":{"y":"s"}}}').output
    expect(out).toContain('interface Config {')
    expect(out).toContain('interface Config2 {')
  })
  it('quotes invalid TS identifier keys', () => {
    expect(jsonToTs('{"first-name":"x"}').output).toContain('"first-name": string')
  })
  it('sanitizes invalid Java identifier keys', () => {
    expect(jsonToJava('{"first-name":"x"}').output).toContain('String first_name;')
  })
  it('dedups Go field names from collision-prone keys', () => {
    const out = jsonToGo('{"a b":1,"a-b":2}').output
    expect(out).toContain('AB int `json:"a b"`')
    expect(out).toContain('AB2 int `json:"a-b"`')
  })
})
