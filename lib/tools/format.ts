import { ok, err, type ToolResult } from './types'
import { format as sqlFormat } from 'sql-formatter'
import beautify from 'js-beautify'
import { minify as cssoMinify } from 'csso'
import xmlFormat from 'xml-formatter'
import { parseDocument } from 'yaml'

// SQL 格式化：缩进 2 空格、关键字大写。dialect 取通用 'sql'。
export function formatSql(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(sqlFormat(input, { tabWidth: 2, keywordCase: 'upper' }))
  } catch (e) {
    return err(e instanceof Error ? e.message : 'SQL 格式化失败')
  }
}

// SQL 压缩：剔除注释、把 token 外的连续空白折叠为单个空格。
// 字符串（'…'、"…"）与反引号标识符（`…`）内部原样保留，避免破坏字面量。
export function minifySql(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  let out = ''
  let i = 0
  const n = input.length
  const padSpace = () => {
    if (out && !out.endsWith(' ')) out += ' '
  }
  while (i < n) {
    const ch = input[i]
    // 行注释：-- …  和  # …
    if ((ch === '-' && input[i + 1] === '-') || ch === '#') {
      const nl = input.indexOf('\n', i)
      i = nl < 0 ? n : nl + 1
      padSpace()
      continue
    }
    // 块注释：/* … */
    if (ch === '/' && input[i + 1] === '*') {
      const end = input.indexOf('*/', i + 2)
      i = end < 0 ? n : end + 2
      padSpace()
      continue
    }
    // 字符串 / 反引号标识符
    if (ch === "'" || ch === '"' || ch === '`') {
      const quote = ch
      let lit = ch
      let j = i + 1
      while (j < n) {
        const c = input[j]
        // 反斜杠转义（反引号不适用）
        if (c === '\\' && quote !== '`' && j + 1 < n) {
          lit += c + input[j + 1]
          j += 2
          continue
        }
        if (c === quote) {
          // 连续两个引号表示一个转义引号（SQL 标准）
          if (input[j + 1] === quote) {
            lit += quote + quote
            j += 2
            continue
          }
          lit += c
          j++
          break
        }
        lit += c
        j++
      }
      out += lit
      i = j
      continue
    }
    // 空白折叠
    if (/\s/.test(ch)) {
      padSpace()
      i++
      continue
    }
    out += ch
    i++
  }
  return ok(out.trim())
}

export function formatCss(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(beautify.css(input, { indent_size: 2 }))
  } catch (e) {
    return err(e instanceof Error ? e.message : 'CSS 格式化失败')
  }
}

export function minifyCss(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(cssoMinify(input, { restructure: false }).css)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'CSS 压缩失败')
  }
}

export function formatHtml(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(beautify.html(input, { indent_size: 2 }))
  } catch (e) {
    return err(e instanceof Error ? e.message : 'HTML 格式化失败')
  }
}

export function formatJs(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(beautify.js(input, { indent_size: 2 }))
  } catch (e) {
    return err(e instanceof Error ? e.message : 'JS 格式化失败')
  }
}

// XML 格式化：字符串级重排（保留注释/CDATA，不经 JSON 往返）。strictMode 校验标签闭合。
export function formatXml(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(xmlFormat(input, { indentation: '  ', lineSeparator: '\n', collapseContent: true, strictMode: true }))
  } catch (e) {
    return err(e instanceof Error ? e.message : 'XML 格式化失败')
  }
}

export function minifyXml(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(xmlFormat.minify(input, { strictMode: true }))
  } catch (e) {
    return err(e instanceof Error ? e.message : 'XML 压缩失败')
  }
}

// YAML 格式化：parseDocument 保留注释并按 2 空格重新缩进；解析错误直接报出。
export function formatYaml(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    const doc = parseDocument(input)
    if (doc.errors.length) return err(doc.errors[0].message)
    return ok(doc.toString({ indent: 2 }))
  } catch (e) {
    return err(e instanceof Error ? e.message : 'YAML 格式化失败')
  }
}
