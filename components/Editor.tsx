import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState, Compartment, type Extension } from '@codemirror/state'
import { HighlightStyle, syntaxHighlighting, StreamLanguage } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'
import type { EditorLang } from '@/lib/tools/types'

// 各语言解析器按需动态加载，避免把 lang-html / lang-javascript 等打进首屏包。
// 标准 lezer 标签由上面的 ckHighlight 统一着色，故各语言外观一致。
const LANG_LOADERS: Record<EditorLang, (() => Promise<Extension>) | null> = {
  text: null,
  json: () => import('@codemirror/lang-json').then((m) => m.json()),
  sql: () => import('@codemirror/lang-sql').then((m) => m.sql()),
  css: () => import('@codemirror/lang-css').then((m) => m.css()),
  html: () => import('@codemirror/lang-html').then((m) => m.html()),
  javascript: () => import('@codemirror/lang-javascript').then((m) => m.javascript()),
  xml: () => import('@codemirror/lang-xml').then((m) => m.xml()),
  yaml: () => import('@codemirror/lang-yaml').then((m) => m.yaml()),
  // JSON5 语法接近 JS 对象字面量（含注释/单引号/无引号键），复用 JS 解析器着色
  json5: () => import('@codemirror/lang-javascript').then((m) => m.javascript()),
  // TOML 无官方包，用 legacy-modes 的 StreamParser
  toml: () => import('@codemirror/legacy-modes/mode/toml').then((m) => StreamLanguage.define(m.toml)),
}

// 主题用 CSS 变量取色（定义在 tailwind.css 的 :root / .dark），
// 因此同一份扩展在明暗两种模式下都能自动适配，无需重建编辑器。
const ckTheme = EditorView.theme({
  '&': { height: '100%', backgroundColor: 'transparent', color: 'var(--ck-fg)', fontSize: '13px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.6', overflow: 'auto' },
  '.cm-content': { padding: '12px 0', caretColor: 'var(--ck-cursor)' },
  '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--ck-gutter)', border: 'none' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 10px 0 16px', minWidth: '0' },
  '.cm-activeLine': { backgroundColor: 'var(--ck-active-line)' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--ck-fg)' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--ck-cursor)' },
  '.cm-selectionBackground, .cm-content ::selection': { backgroundColor: 'var(--ck-selection)' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--ck-selection)' },
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    border: 'none',
    color: 'var(--ck-punct)',
  },
})

const ckHighlight = HighlightStyle.define([
  { tag: t.string, color: 'var(--ck-string)' },
  { tag: [t.number, t.bool, t.null], color: 'var(--ck-number)' },
  { tag: [t.propertyName, t.keyword], color: 'var(--ck-key)' },
  { tag: [t.punctuation, t.separator, t.brace, t.bracket, t.squareBracket], color: 'var(--ck-punct)' },
  { tag: t.invalid, color: 'var(--ck-keyword)' },
])

interface EditorProps {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  language?: EditorLang
  placeholder?: string
}

export function Editor({ value, onChange, readOnly = false, language = 'text', placeholder = '' }: EditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const langField = useRef(new Compartment())

  useEffect(() => {
    if (!host.current) return
    const extensions = [
      basicSetup,
      ckTheme,
      syntaxHighlighting(ckHighlight),
      EditorView.editable.of(!readOnly),
      EditorState.readOnly.of(readOnly),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of(placeholder ? { 'data-placeholder': placeholder } : {}),
      langField.current.of([]),
      EditorView.updateListener.of((u) => {
        if (u.docChanged && onChange) onChange(u.state.doc.toString())
      }),
    ]
    const v = new EditorView({ state: EditorState.create({ doc: value, extensions }), parent: host.current })
    view.current = v
    return () => v.destroy()
    // 仅在挂载/只读变化时重建；语言切换走 compartment 重配置（见下方 effect）
  }, [readOnly])

  // 语言变化：按需加载解析器并重配置 compartment（不重建编辑器）
  useEffect(() => {
    const loader = LANG_LOADERS[language]
    if (!loader) {
      view.current?.dispatch({ effects: langField.current.reconfigure([]) })
      return
    }
    let alive = true
    void loader().then((ext) => {
      if (alive && view.current) view.current.dispatch({ effects: langField.current.reconfigure(ext) })
    })
    return () => {
      alive = false
    }
  }, [language])

  // 外部 value 变化时同步（如点击"清空"或只读输出更新）
  useEffect(() => {
    const v = view.current
    if (v && value !== v.state.doc.toString()) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
    }
  }, [value])

  return <div ref={host} className="h-full overflow-hidden" />
}
