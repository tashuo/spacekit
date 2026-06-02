import { ok, err, type ToolResult } from './types'

function b64urlToJson(seg: string): unknown {
  const b64 = seg.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(seg.length / 4) * 4, '=')
  const bin = atob(b64)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return JSON.parse(new TextDecoder().decode(bytes))
}

export function decodeJwt(input: string): ToolResult {
  const parts = input.trim().split('.')
  if (parts.length !== 3) return err('JWT 必须由 3 段（header.payload.signature）组成')
  try {
    const header = b64urlToJson(parts[0])
    const payload = b64urlToJson(parts[1])
    return ok(
      JSON.stringify({ header, payload, signature: parts[2] }, null, 2),
    )
  } catch {
    return err('无法解析 JWT（header/payload 不是合法的 Base64URL JSON）')
  }
}
