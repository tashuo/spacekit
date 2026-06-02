import type { ToolCategory } from './types'

// 分类显示名（侧栏与工具头共用，保持单一来源）
export const CAT_LABEL: Record<ToolCategory, string> = {
  json: 'JSON',
  convert: '转换',
  codec: '编解码',
  timestamp: '时间戳',
  crypto: '加解密',
  text: '文本',
}
