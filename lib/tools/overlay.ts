import type { ToolResult } from './types'
import { formatJson } from './json'
import { decodeBase64, decodeUrl, decodeUnicode } from './codec'
import { decodeJwt } from './jwt'
import { tsToDate } from './timestamp'

// 划词浮层暴露的高频工具。独立于主 registry，仅 import 轻量同步实现，
// 确保内容脚本(overlay)与 background 包不会被 codegen / crypto-js / 格式化库等重型依赖污染。
// 这里的 id 集合必须与 registry 中 inOverlay 标记一致（由 registry.test 校验，单一事实来源）。
export interface OverlayTool {
  id: string
  run: (input: string, options?: Record<string, unknown>) => ToolResult
}

export const OVERLAY_TOOLS: OverlayTool[] = [
  { id: 'json-format', run: (i, o) => formatJson(i, o) },
  { id: 'base64-decode', run: (i) => decodeBase64(i) },
  { id: 'url-decode', run: (i) => decodeUrl(i) },
  { id: 'unicode-decode', run: (i) => decodeUnicode(i) },
  { id: 'jwt-decode', run: (i) => decodeJwt(i) },
  { id: 'ts-to-date', run: (i, o) => tsToDate(i, { unit: 'auto', tz: (o?.tz as string) ?? 'UTC' }) },
]

export function overlayTools(): OverlayTool[] {
  return OVERLAY_TOOLS
}

// 按选中内容猜测最合适的浮层工具，划词即出大概率想要的结果。
// 顺序由特征强到弱；都不匹配则回落 json-format。
export function guessOverlayTool(text: string): string {
  const s = text.trim()
  if (!s) return 'json-format'
  // JWT：三段 base64url，以 eyJ 开头（header 几乎总是 {"alg|typ）
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$/.test(s)) return 'jwt-decode'
  // 时间戳：10 位（秒）或 13 位（毫秒）纯数字
  if (/^\d{10}$|^\d{13}$/.test(s)) return 'ts-to-date'
  // URL 编码：含 %XX 或 + 充当空格的成对编码
  if (/%[0-9A-Fa-f]{2}/.test(s)) return 'url-decode'
  // Unicode 转义：\uXXXX
  if (/\\u[0-9a-fA-F]{4}/.test(s)) return 'unicode-decode'
  // JSON：以 { 或 [ 开头
  if (/^[[{]/.test(s)) return 'json-format'
  // Base64：仅含 base64 字符、长度为 4 的倍数且足够长（避免把普通单词误判）
  if (s.length >= 8 && s.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(s) && /[A-Z+/=]|[0-9]/.test(s)) {
    return 'base64-decode'
  }
  return 'json-format'
}
