import type { ToolDef } from './types'
import { MESSAGES } from '@/lib/i18n/messages'
import { formatJson, minifyJson, escapeJson, unescapeJson } from './json'
import { encodeBase64, decodeBase64, encodeUrl, decodeUrl, encodeUnicode, decodeUnicode } from './codec'
import { decodeJwt } from './jwt'
import { tsToDate, dateToTs } from './timestamp'
import { md5, sm3 } from './hash'
import { jsonToYaml, yamlToJson } from './convert'
import { dedupLines, sortLines, toUpper, toLower } from './text'
import { jsonToCsv } from './csv'
import { jsonToXml, xmlToJson } from './xml'
import { jsonToTs, jsonToGo, jsonToJava } from './codegen'

export const TOOLS: ToolDef[] = [
  { id: 'json-format', category: 'json', name: 'JSON 格式化', keywords: ['json', 'format', '格式化', '美化'], layout: 'io', inOverlay: true, run: (i, o) => formatJson(i, o) },
  { id: 'json-minify', category: 'json', name: 'JSON 压缩', keywords: ['json', 'minify', '压缩'], layout: 'io', run: (i) => minifyJson(i) },
  { id: 'json-escape', category: 'json', name: 'JSON 转义', keywords: ['json', 'escape', '转义'], layout: 'io', run: (i) => escapeJson(i) },
  { id: 'json-unescape', category: 'json', name: 'JSON 去转义', keywords: ['json', 'unescape', '去转义'], layout: 'io', run: (i) => unescapeJson(i) },
  { id: 'base64-encode', category: 'codec', name: 'Base64 编码', keywords: ['base64', '编码'], layout: 'io', run: (i) => encodeBase64(i) },
  { id: 'base64-decode', category: 'codec', name: 'Base64 解码', keywords: ['base64', '解码'], layout: 'io', inOverlay: true, run: (i) => decodeBase64(i) },
  { id: 'url-encode', category: 'codec', name: 'URL 编码', keywords: ['url', '编码'], layout: 'io', run: (i) => encodeUrl(i) },
  { id: 'url-decode', category: 'codec', name: 'URL 解码', keywords: ['url', '解码'], layout: 'io', inOverlay: true, run: (i) => decodeUrl(i) },
  { id: 'unicode-encode', category: 'codec', name: 'Unicode 编码', keywords: ['unicode', '编码'], layout: 'io', run: (i) => encodeUnicode(i) },
  { id: 'unicode-decode', category: 'codec', name: 'Unicode 解码', keywords: ['unicode', '解码'], layout: 'io', inOverlay: true, run: (i) => decodeUnicode(i) },
  { id: 'jwt-decode', category: 'codec', name: 'JWT 解析', keywords: ['jwt', 'token', '解析'], layout: 'io', inOverlay: true, run: (i) => decodeJwt(i) },
  { id: 'ts-to-date', category: 'timestamp', name: '时间戳转日期', keywords: ['timestamp', '时间戳', '日期'], layout: 'io', inOverlay: true, run: (i, o) => tsToDate(i, { unit: 'auto', tz: (o?.tz as string) ?? 'UTC' }) },
  { id: 'date-to-ts', category: 'timestamp', name: '日期转时间戳', keywords: ['timestamp', '时间戳', '日期'], layout: 'io', run: (i, o) => dateToTs(i, { tz: (o?.tz as string) ?? 'UTC' }) },
  { id: 'md5', category: 'crypto', name: 'MD5', keywords: ['md5', 'hash', '哈希'], layout: 'io', run: (i) => md5(i) },
  { id: 'json-to-yaml', category: 'convert', name: 'JSON 转 YAML', keywords: ['json', 'yaml', '转换'], layout: 'io', run: (i) => jsonToYaml(i) },
  { id: 'yaml-to-json', category: 'convert', name: 'YAML 转 JSON', keywords: ['yaml', 'json', '转换'], layout: 'io', run: (i) => yamlToJson(i) },
  { id: 'json-diff', category: 'json', name: 'JSON 对比', keywords: ['diff', '对比', '比较'], layout: 'diff' },
  { id: 'regex-test', category: 'text', name: '正则测试', keywords: ['regex', '正则', '匹配'], layout: 'regex' },
  { id: 'text-dedup', category: 'text', name: '文本去重', keywords: ['dedup', '去重', '行'], layout: 'io', run: (i) => dedupLines(i) },
  { id: 'text-sort', category: 'text', name: '文本排序', keywords: ['sort', '排序', '行'], layout: 'io', run: (i) => sortLines(i) },
  { id: 'text-upper', category: 'text', name: '转大写', keywords: ['upper', '大写', '大小写'], layout: 'io', run: (i) => toUpper(i) },
  { id: 'text-lower', category: 'text', name: '转小写', keywords: ['lower', '小写', '大小写'], layout: 'io', run: (i) => toLower(i) },
  { id: 'jsonpath-query', category: 'json', name: 'JSONPath 查询', keywords: ['jsonpath', 'query', '查询', '路径'], layout: 'query' },
  { id: 'json-to-xml', category: 'convert', name: 'JSON 转 XML', keywords: ['xml', 'json', '转换'], layout: 'io', run: (i) => jsonToXml(i) },
  { id: 'xml-to-json', category: 'convert', name: 'XML 转 JSON', keywords: ['xml', 'json', '转换'], layout: 'io', run: (i) => xmlToJson(i) },
  { id: 'json-to-csv', category: 'convert', name: 'JSON 转 CSV', keywords: ['csv', 'json', '转换', '表格'], layout: 'io', run: (i) => jsonToCsv(i) },
  { id: 'json-to-ts', category: 'convert', name: 'JSON 转 TS 接口', keywords: ['typescript', 'ts', 'interface', '实体类'], layout: 'io', run: (i) => jsonToTs(i) },
  { id: 'json-to-go', category: 'convert', name: 'JSON 转 Go 结构体', keywords: ['go', 'golang', 'struct', '实体类'], layout: 'io', run: (i) => jsonToGo(i) },
  { id: 'json-to-java', category: 'convert', name: 'JSON 转 Java 类', keywords: ['java', 'class', '实体类'], layout: 'io', run: (i) => jsonToJava(i) },
  { id: 'sm3', category: 'crypto', name: 'SM3', keywords: ['sm3', '国密', 'hash', '哈希'], layout: 'io', run: (i) => sm3(i) },
  { id: 'aes', category: 'crypto', name: 'AES 加解密', keywords: ['aes', '加密', '解密', '对称'], layout: 'crypto' },
  { id: 'des', category: 'crypto', name: 'DES 加解密', keywords: ['des', '加密', '解密', '对称'], layout: 'crypto' },
  { id: 'triple-des', category: 'crypto', name: '3DES 加解密', keywords: ['3des', 'tripledes', '加密', '解密'], layout: 'crypto' },
  { id: 'sm4', category: 'crypto', name: 'SM4 加解密（国密）', keywords: ['sm4', '国密', '加密', '解密'], layout: 'crypto' },
  { id: 'qr-generate', category: 'text', name: '二维码生成', keywords: ['qr', '二维码', 'qrcode', '生成'], layout: 'qrcode' },
  { id: 'qr-decode', category: 'text', name: '二维码解析', keywords: ['qr', '二维码', 'qrcode', '解析', '识别'], layout: 'qrcode' },
]

export function findTool(id: string): ToolDef | undefined {
  return TOOLS.find((t) => t.id === id)
}

export function searchTools(query: string): ToolDef[] {
  const q = query.trim().toLowerCase()
  if (!q) return TOOLS
  // 同时匹配中文名（t.name）、英文名（字典）与 keywords，
  // 无论界面语言中英工具名均可搜到；两种名都参与匹配，故不依赖当前语言。
  return TOOLS.filter((t) => {
    const enName = MESSAGES[`tool.${t.id}`]?.en ?? ''
    return (
      t.name.toLowerCase().includes(q) ||
      enName.toLowerCase().includes(q) ||
      t.keywords.some((k) => k.toLowerCase().includes(q))
    )
  })
}

// 浮层暴露的工具子集（驱动右键菜单与浮层动作，声明式）
export function overlayTools(): ToolDef[] {
  return TOOLS.filter((t) => t.inOverlay)
}
