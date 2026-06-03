import { ok, err, type ToolResult } from './types'

function escapeCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function jsonToCsv(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  let data: unknown
  try {
    data = JSON.parse(input)
  } catch {
    return err('非法 JSON')
  }
  if (!Array.isArray(data)) return err('CSV 转换需要 JSON 数组')
  if (data.length === 0) return ok('')
  const keys: string[] = []
  for (const row of data) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return err('数组元素必须是对象')
    for (const k of Object.keys(row)) if (!keys.includes(k)) keys.push(k)
  }
  const lines = [keys.map(escapeCell).join(',')]
  for (const row of data as Record<string, unknown>[]) {
    lines.push(keys.map((k) => escapeCell(row[k])).join(','))
  }
  return ok(lines.join('\n'))
}
