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
