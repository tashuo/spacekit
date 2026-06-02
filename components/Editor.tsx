import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { json } from '@codemirror/lang-json'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

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
  language?: 'json' | 'text'
  placeholder?: string
}

export function Editor({ value, onChange, readOnly = false, language = 'text', placeholder = '' }: EditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)

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
      ...(language === 'json' ? [json()] : []),
      EditorView.updateListener.of((u) => {
        if (u.docChanged && onChange) onChange(u.state.doc.toString())
      }),
    ]
    const v = new EditorView({ state: EditorState.create({ doc: value, extensions }), parent: host.current })
    view.current = v
    return () => v.destroy()
    // 仅在挂载/只读/语言变化时重建
  }, [readOnly, language])

  // 外部 value 变化时同步（如点击"清空"或只读输出更新）
  useEffect(() => {
    const v = view.current
    if (v && value !== v.state.doc.toString()) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
    }
  }, [value])

  return <div ref={host} className="h-full overflow-hidden" />
}
