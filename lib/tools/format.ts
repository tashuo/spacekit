import { ok, err, type ToolResult } from './types'
import { format as sqlFormat } from 'sql-formatter'
import beautify from 'js-beautify'
import { minify as cssoMinify } from 'csso'
import xmlFormat from 'xml-formatter'
import { parseDocument } from 'yaml'
import JSON5 from 'json5'
import { parse as tomlParse, stringify as tomlStringify } from 'smol-toml'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import { parse as gqlParse, print as gqlPrint } from 'graphql'

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

// JSON5 格式化：解析后以 2 空格美化（输出仍为 JSON5：无引号键、单引号等按需保留）。
export function formatJson5(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(JSON5.stringify(JSON5.parse(input), null, 2))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 JSON5')
  }
}

// TOML 格式化：解析后重新序列化（规范化缩进/表结构）。
export function formatToml(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(tomlStringify(tomlParse(input)))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 TOML')
  }
}

// Markdown 格式化：remark + GFM，规范化标题/列表/表格/强调等（processSync 同步）。
export function formatMarkdown(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(remark().use(remarkGfm).processSync(input).toString())
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Markdown 格式化失败')
  }
}

// 行尾连续反斜杠为奇数 → properties 续行
function endsWithContinuation(line: string): boolean {
  let n = 0
  for (let i = line.length - 1; i >= 0 && line[i] === '\\'; i--) n++
  return n % 2 === 1
}

function trimTrailingBlank(lines: string[]): string[] {
  while (lines.length && lines[lines.length - 1] === '') lines.pop()
  return lines
}

// INI 格式化：行级规范化，保留注释与顺序（不经 parse 往返，零丢失）。
// 规则：段标题 [name] 前留空行(首段除外)、键值统一为 key = value、注释(; #)原样、折叠连续空行。
export function formatIni(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  const out: string[] = []
  let prevBlank = false
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') {
      if (!prevBlank && out.length) {
        out.push('')
        prevBlank = true
      }
      continue
    }
    prevBlank = false
    if (line.startsWith(';') || line.startsWith('#')) {
      out.push(line)
      continue
    }
    if (/^\[.*\]$/.test(line)) {
      if (out.length && out[out.length - 1] !== '') out.push('')
      out.push(`[${line.slice(1, -1).trim()}]`)
      continue
    }
    const eq = line.indexOf('=')
    if (eq >= 0) {
      out.push(`${line.slice(0, eq).trim()} = ${line.slice(eq + 1).trim()}`)
    } else {
      out.push(line) // 未知行原样保留
    }
  }
  return ok(trimTrailingBlank(out).join('\n'))
}

const DOCKER_INSTRUCTIONS = new Set([
  'FROM', 'RUN', 'CMD', 'LABEL', 'MAINTAINER', 'EXPOSE', 'ENV', 'ADD', 'COPY',
  'ENTRYPOINT', 'VOLUME', 'USER', 'WORKDIR', 'ARG', 'ONBUILD', 'STOPSIGNAL', 'HEALTHCHECK', 'SHELL',
])

// Dockerfile 格式化：指令关键字大写、与参数间单空格；注释/解析指令、续行(\)与参数原样保留。
export function formatDockerfile(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  const out: string[] = []
  let prevBlank = false
  let inContinuation = false
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '')
    if (line.trim() === '') {
      if (!inContinuation && !prevBlank && out.length) {
        out.push('')
        prevBlank = true
      }
      continue
    }
    prevBlank = false
    // 续行中的参数行：原样保留（不重解释为指令/注释）
    if (inContinuation) {
      out.push(line)
      inContinuation = endsWithContinuation(line)
      continue
    }
    if (line.trim().startsWith('#')) {
      out.push(line.trim())
      continue
    }
    const m = line.trim().match(/^(\S+)(\s+([\s\S]*))?$/)
    if (m && DOCKER_INSTRUCTIONS.has(m[1].toUpperCase())) {
      out.push(m[3] !== undefined ? `${m[1].toUpperCase()} ${m[3]}` : m[1].toUpperCase())
    } else {
      out.push(line.trim())
    }
    inContinuation = endsWithContinuation(line)
  }
  return ok(trimTrailingBlank(out).join('\n'))
}

// .env 格式化：KEY=value 统一(去 = 周围空白)、保留 export 前缀/引号/注释与顺序。
export function formatEnv(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  const out: string[] = []
  let prevBlank = false
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') {
      if (!prevBlank && out.length) {
        out.push('')
        prevBlank = true
      }
      continue
    }
    prevBlank = false
    if (line.startsWith('#')) {
      out.push(line)
      continue
    }
    const m = line.match(/^(export\s+)?([^=\s]+)\s*=\s*(.*)$/)
    if (m) {
      out.push(`${m[1] ? 'export ' : ''}${m[2]}=${m[3].replace(/\s+$/, '')}`)
    } else {
      out.push(line) // 无 = 的行原样保留
    }
  }
  return ok(trimTrailingBlank(out).join('\n'))
}

// GraphQL 格式化：parse + print 规范化 SDL / 查询（标准缩进与字段排布）。
export function formatGraphql(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(gqlPrint(gqlParse(input)))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 GraphQL')
  }
}

// Protobuf 格式化：按花括号深度重新缩进(2 空格)，跳过字符串与 // /* */ 注释中的括号；保留注释与顺序。
export function formatProto(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  const out: string[] = []
  let depth = 0
  let prevBlank = false
  let inBlock = false // 跨行块注释
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') {
      if (!inBlock && !prevBlank && out.length) {
        out.push('')
        prevBlank = true
      }
      continue
    }
    prevBlank = false
    let net = 0 // 本行净花括号增量
    let leadingClose = 0 // 行首(无实质内容前)的 } 个数 → 决定本行缩进回退
    let sawContent = false
    let inStr: string | null = null
    let blk: boolean = inBlock
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      const c2 = line[i + 1]
      if (blk) {
        if (c === '*' && c2 === '/') {
          blk = false
          i++
        }
        continue
      }
      if (inStr) {
        if (c === '\\') i++
        else if (c === inStr) inStr = null
        continue
      }
      if (c === '/' && c2 === '/') break
      if (c === '/' && c2 === '*') {
        blk = true
        i++
        continue
      }
      if (c === '"' || c === "'") {
        inStr = c
        sawContent = true
        continue
      }
      if (c === '{') {
        net++
        sawContent = true
        continue
      }
      if (c === '}') {
        net--
        if (!sawContent) leadingClose++
        continue
      }
      if (c !== ' ' && c !== '\t') sawContent = true
    }
    out.push('  '.repeat(Math.max(0, depth - leadingClose)) + line)
    depth = Math.max(0, depth + net)
    inBlock = blk
  }
  return ok(trimTrailingBlank(out).join('\n'))
}

// .gitignore 格式化：逐行去首尾空白、保留注释与顺序、折叠连续空行。
export function formatGitignore(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  const out: string[] = []
  let prevBlank = false
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') {
      if (!prevBlank && out.length) {
        out.push('')
        prevBlank = true
      }
      continue
    }
    prevBlank = false
    out.push(line)
  }
  return ok(trimTrailingBlank(out).join('\n'))
}

// crontab 格式化：5 个时间字段间空白归一为单空格、命令原样保留；@special、环境变量、注释各自处理。
export function formatCrontab(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  const out: string[] = []
  let prevBlank = false
  for (const raw of input.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') {
      if (!prevBlank && out.length) {
        out.push('')
        prevBlank = true
      }
      continue
    }
    prevBlank = false
    if (line.startsWith('#')) {
      out.push(line)
      continue
    }
    // @reboot / @daily 等特殊调度
    const special = line.match(/^(@\S+)(?:\s+([\s\S]+))?$/)
    if (special) {
      out.push(special[2] ? `${special[1]} ${special[2]}` : special[1])
      continue
    }
    // 环境变量赋值（cron 允许）
    const env = line.match(/^(\w+)\s*=\s*(.*)$/)
    if (env) {
      out.push(`${env[1]}=${env[2]}`)
      continue
    }
    // 标准 5 字段 + 命令（命令保持原样，仅归一字段间空白）
    const m = line.match(/^(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([\s\S]+)$/)
    if (m) {
      out.push(`${m[1]} ${m[2]} ${m[3]} ${m[4]} ${m[5]} ${m[6]}`)
    } else {
      out.push(line) // 字段不足，原样保留
    }
  }
  return ok(trimTrailingBlank(out).join('\n'))
}

// Java .properties 格式化：键值分隔符(= : 或空白)统一为 =，注释(# !)与续行保留。
export function formatProperties(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  const lines = input.split(/\r?\n/)
  const out: string[] = []
  let prevBlank = false
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (line === '') {
      if (!prevBlank && out.length) {
        out.push('')
        prevBlank = true
      }
      i++
      continue
    }
    prevBlank = false
    if (line.startsWith('#') || line.startsWith('!')) {
      out.push(line)
      i++
      continue
    }
    // 首个未转义的 = : 或空白处分隔键与值
    const m = line.match(/^((?:\\.|[^\\=:\s])+)\s*[=:\s]?\s*(.*)$/)
    const key = m ? m[1] : line
    const val = m ? m[2] : ''
    out.push(`${key}=${val}`)
    // 续行：后续物理行左去空白后原样并入（Java 语义）
    while (endsWithContinuation(out[out.length - 1]) && i + 1 < lines.length) {
      i++
      out.push(lines[i].replace(/^\s+/, ''))
    }
    i++
  }
  return ok(trimTrailingBlank(out).join('\n'))
}
