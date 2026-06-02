import { ok, err, type ToolResult } from './types'

function offsetToLineCol(input: string, pos: number): { line: number; column: number } {
  const upTo = input.slice(0, pos)
  const line = upTo.split('\n').length
  const column = pos - upTo.lastIndexOf('\n')
  return { line, column }
}

// 从 JSON.parse 的报错信息里尽力解析出位置，再换算成 line/column。
// 不同 V8 版本的报错文案不同：旧版含 "position N"，部分版本含 "line L column C"，
// 新版可能两者都没有（如 "Unexpected token '}', ... is not valid JSON"）。
function locate(input: string, e: unknown): { line?: number; column?: number } {
  const msg = e instanceof Error ? e.message : String(e)

  // 形式 A：position N （可能带 (line L column C)）
  const lc = msg.match(/line (\d+) column (\d+)/)
  if (lc) return { line: Number(lc[1]), column: Number(lc[2]) }

  const p = msg.match(/position (\d+)/)
  if (p) return offsetToLineCol(input, Number(p[1]))

  // 形式 B：新版 V8 形如 Unexpected token 'X', "..." is not valid JSON
  // 尝试从被引用的片段在原文中的位置推断（尽力而为，保证返回行列）。
  const tok = msg.match(/Unexpected token '(.)'/)
  if (tok && tok[1]) {
    const idx = input.indexOf(tok[1])
    if (idx >= 0) return offsetToLineCol(input, idx)
  }

  // 兜底：定位到第一处非空白处，至少给出行/列而非 undefined。
  const firstNonWs = input.search(/\S/)
  return offsetToLineCol(input, firstNonWs < 0 ? 0 : firstNonWs)
}

export function formatJson(input: string, options?: { indent?: number }): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    const value = JSON.parse(input)
    return ok(JSON.stringify(value, null, options?.indent ?? 2))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 JSON', locate(input, e))
  }
}

export function minifyJson(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(JSON.stringify(JSON.parse(input)))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 JSON', locate(input, e))
  }
}

// 把任意文本转成 JSON 字符串字面量的"内容"（不含外层引号）
export function escapeJson(input: string): ToolResult {
  const quoted = JSON.stringify(input) // 形如 "...."
  return ok(quoted.slice(1, -1))
}

export function unescapeJson(input: string): ToolResult {
  try {
    return ok(JSON.parse(`"${input}"`))
  } catch {
    return err('无法解析转义序列')
  }
}
