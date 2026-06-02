import type { ToolDef } from './types'
import { formatJson, minifyJson, escapeJson, unescapeJson } from './json'
import { encodeBase64, decodeBase64, encodeUrl, decodeUrl, encodeUnicode, decodeUnicode } from './codec'
import { decodeJwt } from './jwt'
import { tsToDate, dateToTs } from './timestamp'
import { md5 } from './hash'

export const TOOLS: ToolDef[] = [
  { id: 'json-format', category: 'json', name: 'JSON 格式化', keywords: ['json', 'format', '格式化', '美化'], layout: 'io', run: (i, o) => formatJson(i, o) },
  { id: 'json-minify', category: 'json', name: 'JSON 压缩', keywords: ['json', 'minify', '压缩'], layout: 'io', run: (i) => minifyJson(i) },
  { id: 'json-escape', category: 'json', name: 'JSON 转义', keywords: ['json', 'escape', '转义'], layout: 'io', run: (i) => escapeJson(i) },
  { id: 'json-unescape', category: 'json', name: 'JSON 去转义', keywords: ['json', 'unescape', '去转义'], layout: 'io', run: (i) => unescapeJson(i) },
  { id: 'base64-encode', category: 'codec', name: 'Base64 编码', keywords: ['base64', '编码'], layout: 'io', run: (i) => encodeBase64(i) },
  { id: 'base64-decode', category: 'codec', name: 'Base64 解码', keywords: ['base64', '解码'], layout: 'io', run: (i) => decodeBase64(i) },
  { id: 'url-encode', category: 'codec', name: 'URL 编码', keywords: ['url', '编码'], layout: 'io', run: (i) => encodeUrl(i) },
  { id: 'url-decode', category: 'codec', name: 'URL 解码', keywords: ['url', '解码'], layout: 'io', run: (i) => decodeUrl(i) },
  { id: 'unicode-encode', category: 'codec', name: 'Unicode 编码', keywords: ['unicode', '编码'], layout: 'io', run: (i) => encodeUnicode(i) },
  { id: 'unicode-decode', category: 'codec', name: 'Unicode 解码', keywords: ['unicode', '解码'], layout: 'io', run: (i) => decodeUnicode(i) },
  { id: 'jwt-decode', category: 'codec', name: 'JWT 解析', keywords: ['jwt', 'token', '解析'], layout: 'io', run: (i) => decodeJwt(i) },
  { id: 'ts-to-date', category: 'timestamp', name: '时间戳转日期', keywords: ['timestamp', '时间戳', '日期'], layout: 'io', run: (i, o) => tsToDate(i, { unit: 'auto', tz: (o?.tz as string) ?? 'UTC' }) },
  { id: 'date-to-ts', category: 'timestamp', name: '日期转时间戳', keywords: ['timestamp', '时间戳', '日期'], layout: 'io', run: (i, o) => dateToTs(i, { tz: (o?.tz as string) ?? 'UTC' }) },
  { id: 'md5', category: 'crypto', name: 'MD5', keywords: ['md5', 'hash', '哈希'], layout: 'io', run: (i) => md5(i) },
]

export function findTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id)
}

export function searchTools(query: string): ToolDef[] {
  const q = query.trim().toLowerCase()
  if (!q) return TOOLS
  return TOOLS.filter(
    (t) => t.name.toLowerCase().includes(q) || t.keywords.some((k) => k.toLowerCase().includes(q)),
  )
}
