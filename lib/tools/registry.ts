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
// 注：format 工具走动态 import（见下方注册项），重型库（js-beautify 等）拆为按需 chunk，不进 overlay/background 包。

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
  { id: 'password-generator', category: 'crypto', name: '密码生成器', keywords: ['password', '密码', '随机', 'random', 'generate', 'pin'], layout: 'password' },
  // —— 格式化 · 数据/序列化 ——
  { id: 'json5-format', category: 'format', subgroup: 'data', name: 'JSON5 格式化', keywords: ['json5', 'json', '格式化', '美化', 'beautify'], layout: 'io', editorLang: 'json5', run: (i) => import('./format').then((m) => m.formatJson5(i)) },
  { id: 'yaml-format', category: 'format', subgroup: 'data', name: 'YAML 格式化', keywords: ['yaml', 'yml', '格式化', '美化', 'beautify'], layout: 'io', editorLang: 'yaml', run: (i) => import('./format').then((m) => m.formatYaml(i)) },
  { id: 'xml-format', category: 'format', subgroup: 'data', name: 'XML 格式化', keywords: ['xml', '格式化', '美化', 'beautify'], layout: 'io', editorLang: 'xml', run: (i) => import('./format').then((m) => m.formatXml(i)) },
  { id: 'xml-minify', category: 'format', subgroup: 'data', name: 'XML 压缩', keywords: ['xml', '压缩', 'minify', 'compress'], layout: 'io', editorLang: 'xml', run: (i) => import('./format').then((m) => m.minifyXml(i)) },
  { id: 'toml-format', category: 'format', subgroup: 'data', name: 'TOML 格式化', keywords: ['toml', '格式化', '美化', 'beautify', 'config'], layout: 'io', editorLang: 'toml', run: (i) => import('./format').then((m) => m.formatToml(i)) },
  { id: 'proto-format', category: 'format', subgroup: 'data', name: 'Protobuf 格式化', keywords: ['protobuf', 'proto', 'grpc', '格式化', '美化'], layout: 'io', editorLang: 'protobuf', run: (i) => import('./format').then((m) => m.formatProto(i)) },
  // —— 格式化 · Web/样式 ——
  { id: 'html-format', category: 'format', subgroup: 'web', name: 'HTML 格式化', keywords: ['html', '格式化', '美化', 'beautify'], layout: 'io', editorLang: 'html', run: (i) => import('./format').then((m) => m.formatHtml(i)) },
  { id: 'css-format', category: 'format', subgroup: 'web', name: 'CSS 格式化', keywords: ['css', '格式化', '美化', 'beautify'], layout: 'io', editorLang: 'css', run: (i) => import('./format').then((m) => m.formatCss(i)) },
  { id: 'css-minify', category: 'format', subgroup: 'web', name: 'CSS 压缩', keywords: ['css', '压缩', 'minify', 'compress'], layout: 'io', editorLang: 'css', run: (i) => import('./format').then((m) => m.minifyCss(i)) },
  { id: 'js-format', category: 'format', subgroup: 'web', name: 'JS 格式化', keywords: ['js', 'javascript', '格式化', '美化', 'beautify'], layout: 'io', editorLang: 'javascript', run: (i) => import('./format').then((m) => m.formatJs(i)) },
  // —— 格式化 · 查询 ——
  { id: 'sql-format', category: 'format', subgroup: 'query', name: 'SQL 格式化', keywords: ['sql', '格式化', '美化', 'beautify'], layout: 'io', editorLang: 'sql', run: (i) => import('./format').then((m) => m.formatSql(i)) },
  { id: 'sql-minify', category: 'format', subgroup: 'query', name: 'SQL 压缩', keywords: ['sql', '压缩', 'minify', 'compress'], layout: 'io', editorLang: 'sql', run: (i) => import('./format').then((m) => m.minifySql(i)) },
  { id: 'graphql-format', category: 'format', subgroup: 'query', name: 'GraphQL 格式化', keywords: ['graphql', 'gql', '格式化', '美化', 'beautify'], layout: 'io', run: (i) => import('./format').then((m) => m.formatGraphql(i)) },
  // —— 格式化 · 配置 ——
  { id: 'ini-format', category: 'format', subgroup: 'config', name: 'INI 格式化', keywords: ['ini', 'config', '配置', '格式化', '美化'], layout: 'io', editorLang: 'properties', run: (i) => import('./format').then((m) => m.formatIni(i)) },
  { id: 'properties-format', category: 'format', subgroup: 'config', name: 'Properties 格式化', keywords: ['properties', 'java', 'config', '配置', '格式化'], layout: 'io', editorLang: 'properties', run: (i) => import('./format').then((m) => m.formatProperties(i)) },
  { id: 'env-format', category: 'format', subgroup: 'config', name: '.env 格式化', keywords: ['env', 'dotenv', '环境变量', 'config', '格式化'], layout: 'io', editorLang: 'properties', run: (i) => import('./format').then((m) => m.formatEnv(i)) },
  { id: 'dockerfile-format', category: 'format', subgroup: 'config', name: 'Dockerfile 格式化', keywords: ['dockerfile', 'docker', '格式化', '美化'], layout: 'io', editorLang: 'dockerfile', run: (i) => import('./format').then((m) => m.formatDockerfile(i)) },
  { id: 'crontab-format', category: 'format', subgroup: 'config', name: 'crontab 格式化', keywords: ['crontab', 'cron', '定时', '格式化'], layout: 'io', run: (i) => import('./format').then((m) => m.formatCrontab(i)) },
  { id: 'gitignore-format', category: 'format', subgroup: 'config', name: '.gitignore 格式化', keywords: ['gitignore', 'git', '格式化'], layout: 'io', run: (i) => import('./format').then((m) => m.formatGitignore(i)) },
  // —— 格式化 · 文档 ——
  { id: 'markdown-format', category: 'format', subgroup: 'doc', name: 'Markdown 格式化', keywords: ['markdown', 'md', '格式化', '美化', 'beautify'], layout: 'io', editorLang: 'markdown', run: (i) => import('./format').then((m) => m.formatMarkdown(i)) },
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

// 浮层暴露的工具集见 lib/tools/overlay.ts（独立轻量模块，避免内容脚本打入重型库）。
// registry 仅保留 inOverlay 声明性标记，两者一致性由 registry.test 校验。
export const overlayToolIds = (): string[] => TOOLS.filter((t) => t.inOverlay).map((t) => t.id)
