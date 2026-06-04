import { describe, it, expect } from 'vitest'
import { formatSql, minifySql, formatCss, minifyCss, formatHtml, formatJs, formatXml, minifyXml, formatYaml, formatJson5, formatToml, formatMarkdown, formatIni, formatProperties } from '@/lib/tools/format'

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

describe('formatXml', () => {
  it('indents nested elements and preserves comments', () => {
    const r = formatXml('<a><!-- c --><b>x</b></a>')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('\n')
    expect(r.output).toContain('<!-- c -->')
    expect(r.output).toContain('<b>x</b>')
  })
  it('uses LF (no CR)', () => {
    expect(formatXml('<a><b>x</b></a>').output).not.toContain('\r')
  })
  it('errors on mismatched tags (strict)', () => {
    expect(formatXml('<a><b></a>').ok).toBe(false)
  })
  it('errors on empty input', () => {
    expect(formatXml('  ').ok).toBe(false)
  })
})

describe('minifyXml', () => {
  it('collapses inter-tag whitespace', () => {
    expect(minifyXml('<a>\n  <b>x</b>\n</a>').output).toBe('<a><b>x</b></a>')
  })
  it('errors on empty input', () => {
    expect(minifyXml('').ok).toBe(false)
  })
})

describe('formatYaml', () => {
  it('reindents to 2 spaces', () => {
    const r = formatYaml('a:\n    b: 1')
    expect(r.ok).toBe(true)
    expect(r.output).toBe('a:\n  b: 1\n')
  })
  it('preserves comments', () => {
    expect(formatYaml('# top\na: 1').output).toContain('# top')
  })
  it('errors on invalid yaml', () => {
    expect(formatYaml('a:\n  - x\n - y').ok).toBe(false)
  })
  it('errors on empty input', () => {
    expect(formatYaml('   ').ok).toBe(false)
  })
})

describe('formatJson5', () => {
  it('pretty-prints with 2-space indent', () => {
    expect(formatJson5('{a:1,b:[2,3]}').output).toBe('{\n  a: 1,\n  b: [\n    2,\n    3,\n  ],\n}')
  })
  it('accepts comments and trailing commas', () => {
    const r = formatJson5('{ a: 1, /* c */ }')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('a: 1')
  })
  it('errors on invalid input', () => {
    expect(formatJson5('{a:}').ok).toBe(false)
  })
  it('errors on empty input', () => {
    expect(formatJson5('  ').ok).toBe(false)
  })
})

describe('formatToml', () => {
  it('normalizes into valid toml', () => {
    const r = formatToml('title="x"\n[owner]\nname="A"')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('title = "x"')
    expect(r.output).toContain('[owner]')
    expect(r.output).toContain('name = "A"')
  })
  it('round-trips through parse/stringify', () => {
    const out = formatToml('a = 1\nb = true').output
    expect(formatToml(out).output).toBe(out)
  })
  it('errors on invalid toml', () => {
    expect(formatToml('a = = 1').ok).toBe(false)
  })
  it('errors on empty input', () => {
    expect(formatToml('').ok).toBe(false)
  })
})

describe('formatMarkdown', () => {
  it('normalizes heading and list markers', () => {
    const r = formatMarkdown('#  Title\n\n*  item a\n*  item b')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('# Title')
    expect(r.output).toContain('* item a')
  })
  it('reformats GFM tables', () => {
    const r = formatMarkdown('|a|b|\n|-|-|\n|1|2|')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('| a | b |')
    expect(r.output).toContain('| - | - |')
  })
  it('is idempotent', () => {
    const once = formatMarkdown('# Title\n\ntext here').output
    expect(formatMarkdown(once).output).toBe(once)
  })
  it('errors on empty input', () => {
    expect(formatMarkdown('   ').ok).toBe(false)
  })
})

describe('formatIni', () => {
  it('normalizes key spacing and section blank lines', () => {
    expect(formatIni('a=1\n[s]\nb =  2').output).toBe('a = 1\n\n[s]\nb = 2')
  })
  it('preserves comments and collapses blank lines', () => {
    expect(formatIni('; c\n\n\nk=v').output).toBe('; c\n\nk = v')
  })
  it('trims section names', () => {
    expect(formatIni('[ sec ]\nx=1').output).toBe('[sec]\nx = 1')
  })
  it('errors on empty input', () => {
    expect(formatIni('   ').ok).toBe(false)
  })
})

describe('formatProperties', () => {
  it('normalizes colon and whitespace separators to =', () => {
    expect(formatProperties('a : 1\nb   2').output).toBe('a=1\nb=2')
  })
  it('keeps # and ! comments', () => {
    expect(formatProperties('! note\n# c\nk = v').output).toBe('! note\n# c\nk=v')
  })
  it('preserves line continuations', () => {
    expect(formatProperties('k = a\\\n   b').output).toBe('k=a\\\nb')
  })
  it('errors on empty input', () => {
    expect(formatProperties('').ok).toBe(false)
  })
})
