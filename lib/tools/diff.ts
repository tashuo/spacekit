import { ok, err, type ToolResult } from './types'

// 递归按 key 排序，保持数组顺序
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortDeep((value as Record<string, unknown>)[k])
    }
    return out
  }
  return value
}

export function canonicalizeJson(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(JSON.stringify(sortDeep(JSON.parse(input)), null, 2))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 JSON')
  }
}
