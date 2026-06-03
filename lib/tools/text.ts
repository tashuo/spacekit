import { ok, type ToolResult } from './types'

export function dedupLines(input: string): ToolResult {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of input.split('\n')) {
    if (!seen.has(line)) {
      seen.add(line)
      out.push(line)
    }
  }
  return ok(out.join('\n'))
}

export function sortLines(input: string, opts?: { desc?: boolean }): ToolResult {
  const lines = input.split('\n').sort((a, b) => a.localeCompare(b))
  if (opts?.desc) lines.reverse()
  return ok(lines.join('\n'))
}

export function toUpper(input: string): ToolResult {
  return ok(input.toUpperCase())
}

export function toLower(input: string): ToolResult {
  return ok(input.toLowerCase())
}
