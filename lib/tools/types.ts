// 工具运行结果：成功带 output，失败带 error（含可选行列定位）
export interface ToolResult {
  ok: boolean
  output: string
  error?: { message: string; line?: number; column?: number }
}

export const ok = (output: string): ToolResult => ({ ok: true, output })
export const err = (message: string, pos?: { line?: number; column?: number }): ToolResult => ({
  ok: false,
  output: '',
  error: { message, ...pos },
})

// 工具的界面布局类型（Batch 1 只用 io；其余留给后续批次）
export type ToolLayout = 'io' | 'diff' | 'regex' | 'qrcode' | 'query' | 'crypto' | 'password'

export type ToolCategory = 'json' | 'convert' | 'codec' | 'timestamp' | 'crypto' | 'text' | 'format'

// 编辑器语法高亮语言（语言解析器按需动态加载，见 components/Editor.tsx）
export type EditorLang = 'json' | 'text' | 'sql' | 'css' | 'html' | 'javascript' | 'xml' | 'yaml' | 'json5' | 'toml' | 'markdown'

// 注册表条目：声明式描述一个工具
export interface ToolDef {
  id: string
  category: ToolCategory
  // i18n key；Batch 1 暂用中文字面量，第 9 段接入 i18n 后替换
  name: string
  keywords: string[]
  layout: ToolLayout
  // 是否在划词浮层中暴露（仅 io 布局、单输入→输出的高频工具）
  inOverlay?: boolean
  // io 布局编辑器的语法高亮语言；缺省时按 category 推断（json→json，其余→text）
  editorLang?: EditorLang
  // io 布局的纯函数：输入字符串 + 选项 → 结果。
  // 可返回 Promise：重型实现（如格式化库）用动态 import 按需加载，避免打进 overlay/background 包。
  run?: (input: string, options?: Record<string, unknown>) => ToolResult | Promise<ToolResult>
}
