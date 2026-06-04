import { describe, it, expect } from 'vitest'
import { formatSql, minifySql, formatCss, minifyCss, formatHtml, formatJs } from '@/lib/tools/format'

describe('formatSql', () => {
  it('uppercases keywords and indents', () => {
    const r = formatSql('select id,name from users where id=1')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('SELECT')
    expect(r.output).toContain('FROM')
    expect(r.output).toContain('\n')
  })
  it('errors on empty input', () => {
    expect(formatSql('   ').ok).toBe(false)
  })
})

describe('minifySql', () => {
  it('collapses whitespace to single spaces', () => {
    expect(minifySql('SELECT   a,\n  b\nFROM   t').output).toBe('SELECT a, b FROM t')
  })
  it('strips line and block comments', () => {
    expect(minifySql('SELECT a -- c1\nFROM t /* c2 */ WHERE x=1').output).toBe('SELECT a FROM t WHERE x=1')
  })
  it('preserves whitespace and -- inside string literals', () => {
    expect(minifySql("SELECT 'a -- b\n  c' FROM t").output).toBe("SELECT 'a -- b\n  c' FROM t")
  })
  it('handles escaped quote via doubling', () => {
    expect(minifySql("SELECT 'it''s   ok'").output).toBe("SELECT 'it''s   ok'")
  })
  it('preserves backtick identifiers', () => {
    expect(minifySql('SELECT  `a   b`  FROM t').output).toBe('SELECT `a   b` FROM t')
  })
  it('errors on empty input', () => {
    expect(minifySql('  ').ok).toBe(false)
  })
})

describe('formatCss', () => {
  it('beautifies a rule', () => {
    const r = formatCss('a{color:red;margin:0}')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('color: red;')
    expect(r.output).toContain('\n')
  })
  it('errors on empty input', () => {
    expect(formatCss('').ok).toBe(false)
  })
})

describe('minifyCss', () => {
  it('removes whitespace', () => {
    const r = minifyCss('a {\n  color: red;\n  margin: 0;\n}')
    expect(r.ok).toBe(true)
    expect(r.output).toBe('a{color:red;margin:0}')
  })
  it('errors on empty input', () => {
    expect(minifyCss('  ').ok).toBe(false)
  })
})

describe('formatHtml', () => {
  it('indents nested tags', () => {
    const r = formatHtml('<div><p>hi</p></div>')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('\n')
    expect(r.output).toContain('<p>')
  })
  it('errors on empty input', () => {
    expect(formatHtml('  ').ok).toBe(false)
  })
})

describe('formatJs', () => {
  it('reformats minified code', () => {
    const r = formatJs('function f(a){return a+1}')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('return a + 1')
    expect(r.output).toContain('\n')
  })
  it('errors on empty input', () => {
    expect(formatJs('').ok).toBe(false)
  })
})
