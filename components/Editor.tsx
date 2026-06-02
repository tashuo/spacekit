import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { json } from '@codemirror/lang-json'

interface EditorProps {
  value: string
  onChange?: (v: string) => void
  readOnly?: boolean
  language?: 'json' | 'text'
}

export function Editor({ value, onChange, readOnly = false, language = 'text' }: EditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!host.current) return
    const extensions = [
      basicSetup,
      EditorView.editable.of(!readOnly),
      EditorState.readOnly.of(readOnly),
      EditorView.lineWrapping,
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

  // 外部 value 变化时同步（如点击"示例""清空"或只读输出更新）
  useEffect(() => {
    const v = view.current
    if (v && value !== v.state.doc.toString()) {
      v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
    }
  }, [value])

  return <div ref={host} className="h-full overflow-auto border rounded text-sm" />
}
