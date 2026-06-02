import { useEffect, useState } from 'react'
import { Editor } from './Editor'
import type { ToolDef, ToolResult } from '@/lib/tools/types'

export function ToolPanel({ tool }: { tool: ToolDef }) {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<ToolResult>({ ok: true, output: '' })

  useEffect(() => { setInput(''); setResult({ ok: true, output: '' }) }, [tool.id])

  function run() {
    if (tool.run) setResult(tool.run(input))
  }

  return (
    <section className="flex-1 flex flex-col h-full p-3 gap-2">
      <div className="flex items-center gap-2">
        <h2 className="font-medium">{tool.name}</h2>
        <div className="flex-1" />
        <button onClick={run} className="px-3 py-1 text-sm border rounded bg-blue-600 text-white">运行</button>
        <button onClick={() => navigator.clipboard.writeText(result.output)} className="px-3 py-1 text-sm border rounded">复制结果</button>
        <button onClick={() => { setInput(''); setResult({ ok: true, output: '' }) }} className="px-3 py-1 text-sm border rounded">清空</button>
      </div>
      <div className="flex-1 grid grid-cols-2 gap-2 min-h-0">
        <Editor value={input} onChange={setInput} language={tool.category === 'json' ? 'json' : 'text'} />
        <Editor value={result.output} readOnly language={tool.category === 'json' ? 'json' : 'text'} />
      </div>
      <div className="text-sm h-5">
        {result.ok
          ? <span className="text-green-600">✓ 完成</span>
          : <span className="text-red-600">✗ {result.error?.message}{result.error?.line ? ` (第 ${result.error.line} 行第 ${result.error.column} 列)` : ''}</span>}
      </div>
    </section>
  )
}
