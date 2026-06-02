import { ok, err, type ToolResult } from './types'

const te = new TextEncoder()
const td = new TextDecoder()

export function encodeBase64(input: string): ToolResult {
  const bytes = te.encode(input)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return ok(btoa(bin))
}

export function decodeBase64(input: string): ToolResult {
  try {
    const bin = atob(input.trim())
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return ok(td.decode(bytes))
  } catch {
    return err('非法 Base64')
  }
}

export function encodeUrl(input: string): ToolResult {
  return ok(encodeURIComponent(input))
}

export function decodeUrl(input: string): ToolResult {
  try {
    return ok(decodeURIComponent(input))
  } catch {
    return err('非法 URL 编码')
  }
}

export function encodeUnicode(input: string): ToolResult {
  let out = ''
  for (const ch of input) {
    const code = ch.codePointAt(0)!
    out += code > 127 ? '\\u' + code.toString(16).padStart(4, '0') : ch
  }
  return ok(out)
}

export function decodeUnicode(input: string): ToolResult {
  return ok(input.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16))))
}
