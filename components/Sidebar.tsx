import { useState } from 'react'
import { searchTools } from '@/lib/tools/registry'
import type { ToolCategory } from '@/lib/tools/types'

const CAT_LABEL: Record<ToolCategory, string> = {
  json: 'JSON', convert: '转换', codec: '编解码', timestamp: '时间戳', crypto: '加解密', text: '文本',
}

export function Sidebar({ activeId, onSelect }: { activeId: string; onSelect: (id: string) => void }) {
  const [q, setQ] = useState('')
  const list = searchTools(q)
  const cats = [...new Set(list.map((t) => t.category))]
  return (
    <aside className="w-56 shrink-0 border-r h-full overflow-auto p-2">
      <input
        value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索工具…"
        className="w-full mb-3 px-2 py-1 border rounded text-sm"
      />
      {cats.map((c) => (
        <div key={c} className="mb-3">
          <div className="text-xs text-gray-500 px-2 mb-1">{CAT_LABEL[c]}</div>
          {list.filter((t) => t.category === c).map((t) => (
            <button
              key={t.id} onClick={() => onSelect(t.id)}
              className={`block w-full text-left px-2 py-1 rounded text-sm ${t.id === activeId ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >{t.name}</button>
          ))}
        </div>
      ))}
      {list.length === 0 && <div className="text-xs text-gray-400 px-2">无匹配工具</div>}
    </aside>
  )
}
