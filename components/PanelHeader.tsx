import { CAT_LABEL } from '@/lib/tools/categories'
import type { ToolDef } from '@/lib/tools/types'

// 三种 Panel 共用的工具头：标题 + 分类徽章 + 右侧 actions 插槽
export function PanelHeader({ tool, children }: { tool: ToolDef; children?: React.ReactNode }) {
  return (
    <div className="flex h-12 shrink-0 items-center gap-2.5 border-b border-zinc-200 px-4 dark:border-zinc-800">
      <h2 className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">{tool.name}</h2>
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-mono text-[11px] text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        {CAT_LABEL[tool.category]}
      </span>
      <div className="flex-1" />
      {children}
    </div>
  )
}
