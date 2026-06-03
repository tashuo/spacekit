# SpaceKit Batch 2 — 工具篇（JSON↔YAML / JSON Diff / 正则 / 文本）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Batch 1 地基之上新增第 2 批的「纯函数工具」部分——JSON↔YAML 转换、JSON 对比（Diff）、正则测试、文本处理（去重/排序/大小写），全部通过既有的声明式注册表自动接入导航与搜索。

**Architecture:** 延续 Batch 1 原则——所有逻辑是 `lib/tools/` 下的纯函数（无 DOM、无 React），100% 单测覆盖。`io` 布局的工具（YAML、文本处理）直接走注册表 `run`，沿用现有 `ToolPanel`；`diff`/`regex` 是多输入布局，注册表条目不带 `run`，由各自的 Panel 组件直接调用纯函数；`App` 按 `tool.layout` 分发到对应 Panel。三个 Panel 共用一个抽出来的 `PanelHeader`（DRY）。

**Tech Stack:** 沿用 Batch 1（WXT 0.20、React 18、Tailwind 4、TS 5、Zustand 5、vitest 4、CodeMirror 6）；新增 `yaml`（JSON↔YAML）、`@codemirror/merge`（Diff 并排视图）。

> **范围说明：** 这是 Batch 2 的「工具」子计划，不改 manifest、不加权限、零网络。Batch 2 的「划词浮层」（content script + Shadow DOM + 右键菜单 + 快捷键 + `<all_urls>` 权限）是独立架构，另见 `2026-06-03-spacekit-batch2-overlay.md`（后续编写）。本计划完成后产物可独立构建、测试、使用。

---

## File Structure

```
package.json                         加 yaml、@codemirror/merge 依赖     # Task 1
lib/tools/convert.ts    JSON↔YAML 纯函数                                 # Task 2
tests/convert.test.ts                                                    # Task 2
lib/tools/text.ts       去重/排序/大小写 纯函数                          # Task 3
tests/text.test.ts                                                       # Task 3
lib/tools/diff.ts       canonicalizeJson（解析+递归排序 key+美化）        # Task 4
tests/diff.test.ts                                                       # Task 4
lib/tools/regex.ts      testRegex（枚举匹配，自定义返回类型）             # Task 5
tests/regex.test.ts                                                      # Task 5
lib/tools/registry.ts   注册 6 个 io 工具 + json-diff/regex-test 条目     # Task 6
tests/registry.test.ts  补断言                                           # Task 6
components/PanelHeader.tsx   抽出的工具头（标题+分类徽章+actions slot）   # Task 7
components/ToolPanel.tsx     改用 PanelHeader                            # Task 7
entrypoints/app/App.tsx      按 tool.layout 分发                         # Task 7
components/DiffPanel.tsx     @codemirror/merge 并排 Diff                  # Task 8
components/RegexPanel.tsx    正则 + flags + 测试文本 + 匹配列表           # Task 9
```

新工具一览（全部经注册表自动进导航/搜索）：

| id | category | layout | 说明 |
|----|----------|--------|------|
| `json-to-yaml` | convert | io | JSON → YAML |
| `yaml-to-json` | convert | io | YAML → JSON |
| `text-dedup` | text | io | 行去重（保序） |
| `text-sort` | text | io | 行排序（升序） |
| `text-upper` | text | io | 转大写 |
| `text-lower` | text | io | 转小写 |
| `json-diff` | json | diff | 两段 JSON 并排对比 |
| `regex-test` | text | regex | 正则测试 |

---

## Task 1: 安装依赖

**Files:**
- Modify: `package.json`（由 pnpm 自动写入）

- [ ] **Step 1: 安装**

Run: `cd /Users/yaming/Documents/chrome/spacekit && pnpm add yaml @codemirror/merge`
Expected: 安装成功，`package.json` 的 `dependencies` 出现 `yaml` 与 `@codemirror/merge`，lockfile 更新。

- [ ] **Step 2: 验证现状仍绿**

Run: `pnpm test && pnpm compile`
Expected: 24 测试全通过，类型检查通过（仅装库不应破坏现状）。

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml && git commit -m "chore: add yaml + codemirror/merge deps"
```

---

## Task 2: JSON↔YAML 转换

**Files:**
- Create: `lib/tools/convert.ts`, `tests/convert.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/convert.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { jsonToYaml, yamlToJson } from '@/lib/tools/convert'

describe('jsonToYaml', () => {
  it('converts a simple object', () => {
    expect(jsonToYaml('{"a":1}').output).toBe('a: 1\n')
  })
  it('errors on empty input', () => {
    expect(jsonToYaml('   ').ok).toBe(false)
  })
  it('errors on invalid JSON', () => {
    expect(jsonToYaml('x{').ok).toBe(false)
  })
})

describe('yamlToJson', () => {
  it('converts simple yaml to pretty JSON', () => {
    expect(yamlToJson('a: 1').output).toBe('{\n  "a": 1\n}')
  })
  it('errors on empty input', () => {
    expect(yamlToJson('   ').ok).toBe(false)
  })
})

describe('round-trip', () => {
  it('json -> yaml -> json preserves structure', () => {
    const json = '{"name":"Tom","tags":["x","y"],"n":2}'
    const y = jsonToYaml(json)
    expect(y.ok).toBe(true)
    expect(yamlToJson(y.output).output).toBe(
      '{\n  "name": "Tom",\n  "tags": [\n    "x",\n    "y"\n  ],\n  "n": 2\n}',
    )
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test convert`
Expected: FAIL（`jsonToYaml` 未定义）。

- [ ] **Step 3: 实现 `lib/tools/convert.ts`**

```ts
import { parse, stringify } from 'yaml'
import { ok, err, type ToolResult } from './types'

export function jsonToYaml(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(stringify(JSON.parse(input)))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 JSON')
  }
}

export function yamlToJson(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(JSON.stringify(parse(input), null, 2))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 YAML')
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test convert`
Expected: PASS。

> 若 `jsonToYaml('{"a":1}')` 的精确输出与 `'a: 1\n'` 不符（yaml 库版本差异），以实际输出修正断言；round-trip 用例不受格式风格影响，应始终通过。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/convert.ts tests/convert.test.ts && git commit -m "feat: JSON <-> YAML convert tool"
```

---

## Task 3: 文本处理（去重/排序/大小写）

**Files:**
- Create: `lib/tools/text.ts`, `tests/text.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/text.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { dedupLines, sortLines, toUpper, toLower } from '@/lib/tools/text'

describe('dedupLines', () => {
  it('removes duplicate lines preserving first occurrence order', () => {
    expect(dedupLines('a\nb\na\nc\nb').output).toBe('a\nb\nc')
  })
})

describe('sortLines', () => {
  it('sorts ascending by default', () => {
    expect(sortLines('c\na\nb').output).toBe('a\nb\nc')
  })
  it('sorts descending with option', () => {
    expect(sortLines('a\nb\nc', { desc: true }).output).toBe('c\nb\na')
  })
})

describe('case', () => {
  it('to upper', () => {
    expect(toUpper('aB c').output).toBe('AB C')
  })
  it('to lower', () => {
    expect(toLower('aB C').output).toBe('ab c')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test text`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/text.ts`**

```ts
import { ok, type ToolResult } from './types'

export function dedupLines(input: string): ToolResult {
  const seen = new Set<string>()
  const out: string[] = []
  for (const line of input.split('\n')) {
    if (!seen.has(line)) {
      seen.add(line)
      out.push(line)
    }
  }
  return ok(out.join('\n'))
}

export function sortLines(input: string, opts?: { desc?: boolean }): ToolResult {
  const lines = input.split('\n').sort((a, b) => a.localeCompare(b))
  if (opts?.desc) lines.reverse()
  return ok(lines.join('\n'))
}

export function toUpper(input: string): ToolResult {
  return ok(input.toUpperCase())
}

export function toLower(input: string): ToolResult {
  return ok(input.toLowerCase())
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test text`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/text.ts tests/text.test.ts && git commit -m "feat: text dedup/sort/case tools"
```

---

## Task 4: JSON 规范化（供 Diff 使用）

**Files:**
- Create: `lib/tools/diff.ts`, `tests/diff.test.ts`

> `diff` 布局的「差异高亮」由 UI（`@codemirror/merge`）负责；本纯函数负责把两侧 JSON **规范化**（解析→递归按 key 排序→2 空格美化），让对比忽略 key 顺序差异、聚焦真正的值差异。

- [ ] **Step 1: 写失败测试**

`tests/diff.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { canonicalizeJson } from '@/lib/tools/diff'

describe('canonicalizeJson', () => {
  it('sorts keys at the top level', () => {
    expect(canonicalizeJson('{"b":2,"a":1}').output).toBe('{\n  "a": 1,\n  "b": 2\n}')
  })
  it('sorts keys recursively', () => {
    expect(canonicalizeJson('{"z":{"b":1,"a":2}}').output).toBe(
      '{\n  "z": {\n    "a": 2,\n    "b": 1\n  }\n}',
    )
  })
  it('keeps array order', () => {
    expect(canonicalizeJson('[3,1,2]').output).toBe('[\n  3,\n  1,\n  2\n]')
  })
  it('errors on empty input', () => {
    expect(canonicalizeJson('  ').ok).toBe(false)
  })
  it('errors on invalid JSON', () => {
    expect(canonicalizeJson('x').ok).toBe(false)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test diff`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/diff.ts`**

```ts
import { ok, err, type ToolResult } from './types'

// 递归按 key 排序，保持数组顺序
function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value as Record<string, unknown>).sort()) {
      out[k] = sortDeep((value as Record<string, unknown>)[k])
    }
    return out
  }
  return value
}

export function canonicalizeJson(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(JSON.stringify(sortDeep(JSON.parse(input)), null, 2))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 JSON')
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test diff`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/diff.ts tests/diff.test.ts && git commit -m "feat: canonicalize JSON for diff"
```

---

## Task 5: 正则测试

**Files:**
- Create: `lib/tools/regex.ts`, `tests/regex.test.ts`

> 正则结果是结构化的匹配列表，不适合 `ToolResult`（其 `output` 是字符串），故 `testRegex` 用独立返回类型 `RegexResult`。内部强制加 `g` 以枚举全部匹配，但保留用户的 `i/m/s`。

- [ ] **Step 1: 写失败测试**

`tests/regex.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { testRegex } from '@/lib/tools/regex'

describe('testRegex', () => {
  it('finds all matches with index', () => {
    expect(testRegex('\\d+', 'g', 'a1b22c').matches).toEqual([
      { match: '1', index: 1, groups: [] },
      { match: '22', index: 3, groups: [] },
    ])
  })
  it('captures groups', () => {
    expect(testRegex('(a)(b)', 'g', 'ab').matches[0].groups).toEqual(['a', 'b'])
  })
  it('returns empty matches for empty pattern', () => {
    expect(testRegex('', '', 'abc').matches).toEqual([])
  })
  it('reports invalid regex', () => {
    const r = testRegex('(', '', 'x')
    expect(r.ok).toBe(false)
    expect(typeof r.error).toBe('string')
  })
  it('honors the i flag', () => {
    expect(testRegex('abc', 'i', 'ABC').matches.length).toBe(1)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test regex`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/regex.ts`**

```ts
export interface RegexMatch {
  match: string
  index: number
  groups: string[]
}

export interface RegexResult {
  ok: boolean
  matches: RegexMatch[]
  error?: string
}

export function testRegex(pattern: string, flags: string, text: string): RegexResult {
  if (!pattern) return { ok: true, matches: [] }
  const g = flags.includes('g') ? flags : flags + 'g'
  let re: RegExp
  try {
    re = new RegExp(pattern, g)
  } catch (e) {
    return { ok: false, matches: [], error: e instanceof Error ? e.message : '非法正则' }
  }
  const matches: RegexMatch[] = []
  for (const m of text.matchAll(re)) {
    matches.push({ match: m[0], index: m.index ?? 0, groups: m.slice(1) as string[] })
  }
  return { ok: true, matches }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test regex`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/regex.ts tests/regex.test.ts && git commit -m "feat: regex test tool"
```

---

## Task 6: 注册到工具注册表

**Files:**
- Modify: `lib/tools/registry.ts`
- Modify: `tests/registry.test.ts`

- [ ] **Step 1: 补失败测试**

在 `tests/registry.test.ts` 的 `describe('registry', ...)` 内追加：
```ts
  it('registers batch-2 io tools that run', () => {
    expect(findTool('json-to-yaml')!.run!('{"a":1}').output).toBe('a: 1\n')
    expect(findTool('text-dedup')!.run!('a\na\nb').output).toBe('a\nb')
  })
  it('registers diff/regex tools with the right layout and no run', () => {
    expect(findTool('json-diff')!.layout).toBe('diff')
    expect(findTool('json-diff')!.run).toBeUndefined()
    expect(findTool('regex-test')!.layout).toBe('regex')
    expect(findTool('regex-test')!.run).toBeUndefined()
  })
  it('search finds batch-2 tools', () => {
    expect(searchTools('yaml').some((t) => t.id === 'json-to-yaml')).toBe(true)
    expect(searchTools('正则').some((t) => t.id === 'regex-test')).toBe(true)
  })
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test registry`
Expected: FAIL（新工具未注册）。

- [ ] **Step 3: 修改 `lib/tools/registry.ts`**

在 import 区追加：
```ts
import { jsonToYaml, yamlToJson } from './convert'
import { dedupLines, sortLines, toUpper, toLower } from './text'
```

在 `TOOLS` 数组末尾（`md5` 之后）追加这些条目：
```ts
  { id: 'json-to-yaml', category: 'convert', name: 'JSON 转 YAML', keywords: ['json', 'yaml', '转换'], layout: 'io', run: (i) => jsonToYaml(i) },
  { id: 'yaml-to-json', category: 'convert', name: 'YAML 转 JSON', keywords: ['yaml', 'json', '转换'], layout: 'io', run: (i) => yamlToJson(i) },
  { id: 'json-diff', category: 'json', name: 'JSON 对比', keywords: ['diff', '对比', '比较'], layout: 'diff' },
  { id: 'regex-test', category: 'text', name: '正则测试', keywords: ['regex', '正则', '匹配'], layout: 'regex' },
  { id: 'text-dedup', category: 'text', name: '文本去重', keywords: ['dedup', '去重', '行'], layout: 'io', run: (i) => dedupLines(i) },
  { id: 'text-sort', category: 'text', name: '文本排序', keywords: ['sort', '排序', '行'], layout: 'io', run: (i) => sortLines(i) },
  { id: 'text-upper', category: 'text', name: '转大写', keywords: ['upper', '大写', '大小写'], layout: 'io', run: (i) => toUpper(i) },
  { id: 'text-lower', category: 'text', name: '转小写', keywords: ['lower', '小写', '大小写'], layout: 'io', run: (i) => toLower(i) },
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test`
Expected: 全部通过（含原有 + 新增断言）。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/registry.ts tests/registry.test.ts && git commit -m "feat: register batch-2 tools in registry"
```

---

## Task 7: 抽出 PanelHeader + App 按布局分发

**Files:**
- Create: `components/PanelHeader.tsx`
- Modify: `components/ToolPanel.tsx`
- Modify: `entrypoints/app/App.tsx`

> `io` 工具仍走 `ToolPanel`。`diff`/`regex` 的 Panel 在 Task 8/9 创建；本任务先建分发骨架并临时给未实现布局一个占位，避免编译断裂。

- [ ] **Step 1: 创建 `components/PanelHeader.tsx`**

```tsx
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
```

- [ ] **Step 2: `components/ToolPanel.tsx` 改用 PanelHeader**

把顶部「工具头」那段 `<div className="flex h-12 ...">…</div>`（含标题、分类徽章、`flex-1`、清空按钮）整体替换为：
```tsx
      <PanelHeader tool={tool}>
        <button
          type="button"
          onClick={() => setInput('')}
          disabled={!hasInput}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <TrashIcon className="h-3.5 w-3.5" />
          清空
        </button>
      </PanelHeader>
```
并在文件顶部加 import：
```tsx
import { PanelHeader } from './PanelHeader'
```
顶部 import 里删去不再使用的 `CAT_LABEL`（已移入 PanelHeader）：将 `import { CAT_LABEL } from '@/lib/tools/categories'` 删除。

- [ ] **Step 3: `entrypoints/app/App.tsx` 按布局分发**

顶部 import 改为：
```tsx
import { ToolPanel } from '@/components/ToolPanel'
```
新增一个根据布局选 Panel 的辅助（放在 `App` 函数之前）：
```tsx
function ToolView({ tool }: { tool: import('@/lib/tools/types').ToolDef }) {
  switch (tool.layout) {
    // diff / regex 在 Task 8/9 接入
    default:
      return <ToolPanel tool={tool} />
  }
}
```
把 `<ToolPanel tool={tool} />` 替换为 `<ToolView tool={tool} />`。

- [ ] **Step 4: 验证编译 + 测试**

Run: `pnpm compile && pnpm test`
Expected: 通过（行为不变，仅重构）。

- [ ] **Step 5: Commit**

```bash
git add components/PanelHeader.tsx components/ToolPanel.tsx entrypoints/app/App.tsx && git commit -m "refactor: shared PanelHeader + layout dispatch"
```

---

## Task 8: DiffPanel（@codemirror/merge 并排对比）

**Files:**
- Create: `components/DiffPanel.tsx`
- Modify: `entrypoints/app/App.tsx`

- [ ] **Step 1: 创建 `components/DiffPanel.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import { MergeView } from '@codemirror/merge'
import { EditorView, basicSetup } from 'codemirror'
import { json } from '@codemirror/lang-json'
import { canonicalizeJson } from '@/lib/tools/diff'
import { PanelHeader } from './PanelHeader'
import type { ToolDef } from '@/lib/tools/types'

export function DiffPanel({ tool }: { tool: ToolDef }) {
  const host = useRef<HTMLDivElement>(null)
  const mv = useRef<MergeView | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!host.current) return
    const exts = [basicSetup, EditorView.lineWrapping, json()]
    const view = new MergeView({
      a: { doc: '', extensions: exts },
      b: { doc: '', extensions: [...exts] },
      parent: host.current,
    })
    mv.current = view
    return () => view.destroy()
  }, [])

  // 读取两侧文本，各自规范化后写回；高亮差异由 MergeView 自动更新
  function canonicalizeBoth() {
    const view = mv.current
    if (!view) return
    let problem = ''
    for (const side of [view.a, view.b]) {
      const text = side.state.doc.toString()
      if (!text.trim()) continue
      const r = canonicalizeJson(text)
      if (r.ok) {
        side.dispatch({ changes: { from: 0, to: side.state.doc.length, insert: r.output } })
      } else {
        problem = r.error?.message ?? '非法 JSON'
      }
    }
    setMsg(problem ? `✗ ${problem}` : '✓ 已规范化两侧（按 key 排序）')
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950">
      <PanelHeader tool={tool}>
        <button
          type="button"
          onClick={canonicalizeBoth}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          规范化对比
        </button>
      </PanelHeader>
      <div ref={host} className="min-h-0 flex-1 overflow-auto text-sm [&_.cm-mergeView]:h-full [&_.cm-mergeViewEditors]:h-full" />
      <div className="flex h-9 shrink-0 items-center border-t border-zinc-200 px-4 text-xs text-zinc-400 dark:border-zinc-800">
        {msg || '在左右两侧粘贴 JSON，差异会自动高亮；点「规范化对比」可忽略 key 顺序'}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: 接入分发**

`entrypoints/app/App.tsx`：顶部加 `import { DiffPanel } from '@/components/DiffPanel'`，在 `ToolView` 的 `switch` 中加分支：
```tsx
    case 'diff':
      return <DiffPanel tool={tool} />
```

- [ ] **Step 3: 验证编译 + 构建**

Run: `pnpm compile && pnpm build`
Expected: 通过，`.output/chrome-mv3` 生成。

- [ ] **Step 4: 手动验证**

`pnpm dev` 或加载 `.output/chrome-mv3`，打开 SpaceKit → 侧栏 JSON 分类下出现「JSON 对比」。左右各粘贴 `{"a":1,"b":2}` 与 `{"b":2,"a":1}`，点「规范化对比」后两侧一致（无差异高亮）；改一处值后出现差异高亮。

- [ ] **Step 5: Commit**

```bash
git add components/DiffPanel.tsx entrypoints/app/App.tsx && git commit -m "feat: JSON diff panel (merge view)"
```

---

## Task 9: RegexPanel（正则 + flags + 测试文本 + 匹配列表）

**Files:**
- Create: `components/RegexPanel.tsx`
- Modify: `entrypoints/app/App.tsx`

- [ ] **Step 1: 创建 `components/RegexPanel.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { testRegex } from '@/lib/tools/regex'
import { PanelHeader } from './PanelHeader'
import type { ToolDef } from '@/lib/tools/types'

const FLAGS: { flag: string; label: string }[] = [
  { flag: 'g', label: '全局 g' },
  { flag: 'i', label: '忽略大小写 i' },
  { flag: 'm', label: '多行 m' },
  { flag: 's', label: '点匹配换行 s' },
]

export function RegexPanel({ tool }: { tool: ToolDef }) {
  const [pattern, setPattern] = useState('')
  const [flags, setFlags] = useState('g')
  const [text, setText] = useState('')

  const result = useMemo(() => testRegex(pattern, flags, text), [pattern, flags, text])

  function toggleFlag(f: string) {
    setFlags((cur) => (cur.includes(f) ? cur.replace(f, '') : cur + f))
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950">
      <PanelHeader tool={tool} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-zinc-400">/</span>
          <input
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="正则表达式"
            spellCheck={false}
            className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-sm outline-none focus:border-teal-500/50 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <span className="font-mono text-zinc-400">/{flags}</span>
        </div>
        <div className="flex flex-wrap gap-3">
          {FLAGS.map(({ flag, label }) => (
            <label key={flag} className="flex cursor-pointer items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
              <input type="checkbox" checked={flags.includes(flag)} onChange={() => toggleFlag(flag)} />
              {label}
            </label>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="测试文本"
          spellCheck={false}
          className="min-h-32 flex-1 resize-none rounded-md border border-zinc-200 bg-zinc-50 p-3 font-mono text-sm outline-none focus:border-teal-500/50 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
          {!result.ok ? (
            <span className="text-sm text-rose-600 dark:text-rose-400">✗ {result.error}</span>
          ) : (
            <>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                {result.matches.length} 个匹配
              </div>
              <ul className="space-y-1">
                {result.matches.map((m, i) => (
                  <li key={i} className="font-mono text-sm">
                    <span className="text-teal-600 dark:text-teal-400">{JSON.stringify(m.match)}</span>
                    <span className="text-zinc-400"> @ {m.index}</span>
                    {m.groups.length > 0 && (
                      <span className="text-zinc-500"> 组: {m.groups.map((g) => JSON.stringify(g)).join(', ')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: 接入分发**

`entrypoints/app/App.tsx`：顶部加 `import { RegexPanel } from '@/components/RegexPanel'`，在 `ToolView` 的 `switch` 中加分支：
```tsx
    case 'regex':
      return <RegexPanel tool={tool} />
```

- [ ] **Step 3: 验证编译 + 构建**

Run: `pnpm compile && pnpm build`
Expected: 通过。

- [ ] **Step 4: 手动验证**

打开「正则测试」（文本分类）。pattern 填 `\d+`，测试文本填 `a1 b22 c333`，结果列出 3 个匹配及各自 index；填非法正则 `(` 显示错误信息；勾选 `i` 后大小写不敏感生效。

- [ ] **Step 5: Commit**

```bash
git add components/RegexPanel.tsx entrypoints/app/App.tsx && git commit -m "feat: regex test panel"
```

---

## Task 10: 收尾（全量测试 + 类型检查 + 构建）

- [ ] **Step 1: 全量校验**

Run: `pnpm test && pnpm compile && pnpm build`
Expected: 全绿；`.output/chrome-mv3` 生成无报错。

- [ ] **Step 2: Commit（如有改动）**

```bash
git add -A && git commit -m "chore: batch-2 tools green (tests + build)"
```

---

## Self-Review 备注（已核对）

- **Spec 覆盖（§11 第 2 批的工具部分）**：JSON↔YAML（Task 2）、JSON Diff（Task 4 纯函数 + Task 8 UI）、正则测试（Task 5 + Task 9）、文本处理 去重/排序/大小写（Task 3 + 注册 Task 6）。**第 2 批的划词浮层**不在本计划，归入 `2026-06-03-spacekit-batch2-overlay.md`。
- **类型一致性**：`io` 工具复用 Batch 1 的 `ToolResult`/`ok`/`err` 与注册表 `run: (input, options) => ToolResult`；`diff`/`regex` 条目无 `run`（`ToolDef.run` 本就 optional），由 `DiffPanel`/`RegexPanel` 直接调用 `canonicalizeJson` / `testRegex`。`RegexResult`/`RegexMatch` 为 regex 专用类型，仅 `regex.ts` 与 `RegexPanel` 使用。`ToolLayout` 已含 `'diff'`/`'regex'`，无需改类型。
- **布局分发**：`App` 经 `ToolView` 按 `tool.layout` 分发；`PanelHeader` 由 ToolPanel/DiffPanel/RegexPanel 共用（DRY）。Task 7 先建骨架（仅 default），Task 8/9 增量加 `case`，每步均可编译。
- **测试策略**：沿用 Batch 1——只对 `lib/tools/` 纯函数做单测（convert/text/diff/regex + registry 断言）；UI（Diff/Regex Panel）以 `compile`+`build`+手动验证覆盖，符合 spec §10「核心逻辑集中在可测纯函数层」。
- **已知简化/留待后续**：`@codemirror/merge` 的差异配色暂用其默认样式（未接入 Batch 1 的 CSS 变量主题），列为后续 UI 打磨项；正则不做 ReDoS 防护（本地工具、用户自有正则，可接受）；i18n 沿用 Batch 1 的中文字面量，整体 i18n 留到后续统一接入。
```
