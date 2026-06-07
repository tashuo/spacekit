export interface HandoffPayload {
  toolId: string
  text: string
}

// 文本上限（字符）；划词通常很短，超出截断以控制 URL 长度
const MAX_HANDOFF_TEXT = 8192

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(s: string): string {
  let b64 = s.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4) b64 += '='
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// toolId + text → 不含 '#' 的 hash 串：t=<id>&x=<base64url>
export function encodeHandoff(toolId: string, text: string): string {
  const clipped = text.length > MAX_HANDOFF_TEXT ? text.slice(0, MAX_HANDOFF_TEXT) : text
  return new URLSearchParams({ t: toolId, x: toBase64Url(clipped) }).toString()
}

// 解析 location.hash；缺字段 / 非法 base64 / 空 toolId → null
export function decodeHandoff(hash: string): HandoffPayload | null {
  const h = hash.startsWith('#') ? hash.slice(1) : hash
  if (!h) return null
  const params = new URLSearchParams(h)
  const toolId = params.get('t')
  const x = params.get('x')
  if (!toolId) return null
  try {
    return { toolId, text: x ? fromBase64Url(x) : '' }
  } catch {
    return null
  }
}
