# SpaceKit Batch 3A — JSON 进阶（查询 / XML / CSV / 实体类）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Batch 3 的「JSON 进阶」部分——JSONPath 查询、JSON↔XML 互转、JSON→CSV、JSON→实体类（TypeScript interface / Go struct / Java class），全部经声明式注册表自动接入命令面板。

**Architecture:** 延续既有原则——逻辑是 `lib/tools/` 纯函数（无 DOM/React），单测覆盖。CSV 与实体类生成自实现（无运行时库依赖）；JSONPath 用 `jsonpath-plus`、XML 用 `fast-xml-parser`。`io` 布局工具（XML 双向、CSV、三种实体类）走注册表 `run`；JSONPath 查询是「JSON + 表达式」双输入，新增 `query` 布局 + `QueryPanel`，由 App 按 `tool.layout` 分发（与既有 diff/regex 同构）。

**Tech Stack:** 沿用现有栈；新增 `jsonpath-plus`、`fast-xml-parser`。

> **范围：** Batch 3 的第一份子计划。加解密（3B）、二维码（3C）另见后续计划。完成后产物可独立构建/测试/使用。命令面板（Batch 2 改版）会自动收录这些新工具，无需改 UI 外壳。

---

## File Structure

```
package.json                       加 jsonpath-plus、fast-xml-parser        # Task 1
lib/tools/jsonpath.ts   queryJsonPath（JSON + 表达式 → 结果）              # Task 2
lib/tools/csv.ts        jsonToCsv（JSON 数组 → CSV）                        # Task 3
lib/tools/xml.ts        jsonToXml / xmlToJson                              # Task 4
lib/tools/codegen.ts    jsonToTs / jsonToGo / jsonToJava                   # Task 5
lib/tools/types.ts      ToolLayout 加 'query'                              # Task 6
lib/tools/registry.ts   注册 7 个新工具                                     # Task 6
tests/*.test.ts         各模块单测                                          # 随对应 Task
components/QueryPanel.tsx   JSONPath 查询面板（query 布局）                  # Task 7
entrypoints/app/App.tsx     ToolView 加 case 'query'                       # Task 7
```

新工具一览：

| id | category | layout | 说明 |
|----|----------|--------|------|
| `jsonpath-query` | json | query | JSONPath 查询 |
| `json-to-xml` | convert | io | JSON → XML |
| `xml-to-json` | convert | io | XML → JSON |
| `json-to-csv` | convert | io | JSON 数组 → CSV |
| `json-to-ts` | convert | io | JSON → TS interface |
| `json-to-go` | convert | io | JSON → Go struct |
| `json-to-java` | convert | io | JSON → Java class |

---

## Task 1: 安装依赖

- [ ] **Step 1: 安装**

Run: `cd /Users/yaming/Documents/chrome/spacekit && pnpm add jsonpath-plus fast-xml-parser`
Expected: `dependencies` 出现两库，lockfile 更新。

- [ ] **Step 2: 现状仍绿**

Run: `pnpm test && pnpm compile`
Expected: 51 测试通过、类型检查通过。

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml && git commit -m "chore: add jsonpath-plus + fast-xml-parser"
```

---

## Task 2: JSONPath 查询

**Files:**
- Create: `lib/tools/jsonpath.ts`, `tests/jsonpath.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/jsonpath.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { queryJsonPath } from '@/lib/tools/jsonpath'

describe('queryJsonPath', () => {
  it('returns matched values as a JSON array', () => {
    expect(queryJsonPath('{"a":{"b":[1,2,3]}}', '$.a.b[*]').output).toBe('[\n  1,\n  2,\n  3\n]')
  })
  it('returns a single match wrapped in an array', () => {
    expect(queryJsonPath('{"a":1}', '$.a').output).toBe('[\n  1\n]')
  })
  it('errors on empty json', () => {
    expect(queryJsonPath('  ', '$').ok).toBe(false)
  })
  it('errors on empty path', () => {
    expect(queryJsonPath('{"a":1}', '  ').ok).toBe(false)
  })
  it('errors on invalid json', () => {
    expect(queryJsonPath('x{', '$').ok).toBe(false)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test jsonpath`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/jsonpath.ts`**

```ts
import { JSONPath } from 'jsonpath-plus'
import { ok, err, type ToolResult } from './types'

export function queryJsonPath(json: string, path: string): ToolResult {
  if (!json.trim()) return err('输入为空')
  if (!path.trim()) return err('请输入 JSONPath 表达式')
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return err('非法 JSON')
  }
  try {
    const result = JSONPath({ path, json: data as object })
    return ok(JSON.stringify(result, null, 2))
  } catch (e) {
    return err(e instanceof Error ? e.message : 'JSONPath 查询失败')
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test jsonpath`
Expected: PASS。

> 若 `jsonpath-plus` 的导入或调用签名与此不符（版本差异），以库实际 API 为准做最小调整；返回值应为「匹配值数组的 pretty JSON」。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/jsonpath.ts tests/jsonpath.test.ts && git commit -m "feat: JSONPath query tool"
```

---

## Task 3: JSON → CSV

**Files:**
- Create: `lib/tools/csv.ts`, `tests/csv.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/csv.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { jsonToCsv } from '@/lib/tools/csv'

describe('jsonToCsv', () => {
  it('converts an array of objects', () => {
    expect(jsonToCsv('[{"a":1,"b":2},{"a":3,"b":4}]').output).toBe('a,b\n1,2\n3,4')
  })
  it('unions keys across rows (first-seen order)', () => {
    expect(jsonToCsv('[{"a":1},{"b":2}]').output).toBe('a,b\n1,\n,2')
  })
  it('quotes values containing comma/quote/newline', () => {
    expect(jsonToCsv('[{"a":"x,y"}]').output).toBe('a\n"x,y"')
    expect(jsonToCsv('[{"a":"he said \\"hi\\""}]').output).toBe('a\n"he said ""hi"""')
  })
  it('errors when top-level is not an array', () => {
    expect(jsonToCsv('{"a":1}').ok).toBe(false)
  })
  it('errors when an element is not an object', () => {
    expect(jsonToCsv('[1,2]').ok).toBe(false)
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test csv`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/csv.ts`**

```ts
import { ok, err, type ToolResult } from './types'

function escapeCell(v: unknown): string {
  const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function jsonToCsv(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  let data: unknown
  try {
    data = JSON.parse(input)
  } catch {
    return err('非法 JSON')
  }
  if (!Array.isArray(data)) return err('CSV 转换需要 JSON 数组')
  if (data.length === 0) return ok('')
  const keys: string[] = []
  for (const row of data) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return err('数组元素必须是对象')
    for (const k of Object.keys(row)) if (!keys.includes(k)) keys.push(k)
  }
  const lines = [keys.map(escapeCell).join(',')]
  for (const row of data as Record<string, unknown>[]) {
    lines.push(keys.map((k) => escapeCell(row[k])).join(','))
  }
  return ok(lines.join('\n'))
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test csv`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/csv.ts tests/csv.test.ts && git commit -m "feat: JSON to CSV tool"
```

---

## Task 4: JSON ↔ XML

**Files:**
- Create: `lib/tools/xml.ts`, `tests/xml.test.ts`

- [ ] **Step 1: 写失败测试**

`tests/xml.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { jsonToXml, xmlToJson } from '@/lib/tools/xml'

describe('xmlToJson', () => {
  it('parses an element into JSON', () => {
    const r = xmlToJson('<root><a>1</a><b>hi</b></root>')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('"root"')
    expect(r.output).toContain('"a"')
    expect(r.output).toContain('"b"')
  })
  it('errors on empty input', () => {
    expect(xmlToJson('  ').ok).toBe(false)
  })
})

describe('jsonToXml', () => {
  it('builds XML from JSON', () => {
    const r = jsonToXml('{"root":{"a":1,"b":"hi"}}')
    expect(r.ok).toBe(true)
    expect(r.output).toContain('<a>1</a>')
    expect(r.output).toContain('<b>hi</b>')
  })
  it('errors on invalid json', () => {
    expect(jsonToXml('x{').ok).toBe(false)
  })
})

describe('round-trip', () => {
  it('json -> xml -> json keeps the leaf value', () => {
    const xml = jsonToXml('{"root":{"a":"hi"}}').output
    expect(xmlToJson(xml).output).toContain('"hi"')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test xml`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/xml.ts`**

```ts
import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { ok, err, type ToolResult } from './types'

const OPTS = { ignoreAttributes: false, attributeNamePrefix: '@_' }
const parser = new XMLParser(OPTS)
const builder = new XMLBuilder({ ...OPTS, format: true, indentBy: '  ' })

export function xmlToJson(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(JSON.stringify(parser.parse(input), null, 2))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 XML')
  }
}

export function jsonToXml(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(builder.build(JSON.parse(input)))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 JSON')
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test xml`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/xml.ts tests/xml.test.ts && git commit -m "feat: JSON <-> XML tools"
```

---

## Task 5: JSON → 实体类（TS / Go / Java）

**Files:**
- Create: `lib/tools/codegen.ts`, `tests/codegen.test.ts`

> 共享一套类型推断（`inferShape`），三种语言各自渲染。要求顶层是 JSON 对象。嵌套对象按字段名 PascalCase 生成命名类型；数组取首元素推断元素类型（空数组 → any/interface{}/Object）。

- [ ] **Step 1: 写失败测试**

`tests/codegen.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { jsonToTs, jsonToGo, jsonToJava } from '@/lib/tools/codegen'

const JSON_SRC = '{"name":"Tom","age":3,"active":true,"tags":["a","b"],"addr":{"city":"X"}}'

describe('jsonToTs', () => {
  it('generates interfaces with inferred field types', () => {
    const out = jsonToTs(JSON_SRC).output
    expect(out).toContain('interface Root {')
    expect(out).toContain('name: string')
    expect(out).toContain('age: number')
    expect(out).toContain('active: boolean')
    expect(out).toContain('tags: string[]')
    expect(out).toContain('addr: Addr')
    expect(out).toContain('interface Addr {')
    expect(out).toContain('city: string')
  })
  it('errors when top-level is not an object', () => {
    expect(jsonToTs('[1,2]').ok).toBe(false)
  })
})

describe('jsonToGo', () => {
  it('generates a struct with json tags', () => {
    const out = jsonToGo(JSON_SRC).output
    expect(out).toContain('type Root struct {')
    expect(out).toContain('Name string `json:"name"`')
    expect(out).toContain('Age int `json:"age"`')
    expect(out).toContain('Tags []string `json:"tags"`')
    expect(out).toContain('Addr Addr `json:"addr"`')
  })
})

describe('jsonToJava', () => {
  it('generates a class with typed fields', () => {
    const out = jsonToJava(JSON_SRC).output
    expect(out).toContain('class Root {')
    expect(out).toContain('String name;')
    expect(out).toContain('int age;')
    expect(out).toContain('List<String> tags;')
    expect(out).toContain('Addr addr;')
  })
})
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test codegen`
Expected: FAIL。

- [ ] **Step 3: 实现 `lib/tools/codegen.ts`**

```ts
import { ok, err, type ToolResult } from './types'

type Shape =
  | { kind: 'string' }
  | { kind: 'number'; int: boolean }
  | { kind: 'boolean' }
  | { kind: 'null' }
  | { kind: 'any' }
  | { kind: 'array'; elem: Shape }
  | { kind: 'object'; name: string; fields: { key: string; shape: Shape }[] }

function pascal(key: string): string {
  const cleaned = key.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ''))
  return cleaned ? cleaned[0].toUpperCase() + cleaned.slice(1) : 'Field'
}

function inferShape(value: unknown, name: string): Shape {
  if (value === null) return { kind: 'null' }
  if (Array.isArray(value)) {
    return { kind: 'array', elem: value.length ? inferShape(value[0], name) : { kind: 'any' } }
  }
  switch (typeof value) {
    case 'string':
      return { kind: 'string' }
    case 'number':
      return { kind: 'number', int: Number.isInteger(value) }
    case 'boolean':
      return { kind: 'boolean' }
    case 'object': {
      const fields = Object.keys(value as object).map((key) => ({
        key,
        shape: inferShape((value as Record<string, unknown>)[key], pascal(key)),
      }))
      return { kind: 'object', name, fields }
    }
    default:
      return { kind: 'any' }
  }
}

// 深度优先收集所有 object 形状，Root 在前，按 name 去重
function collectObjects(shape: Shape, acc: Extract<Shape, { kind: 'object' }>[] = []): Extract<Shape, { kind: 'object' }>[] {
  if (shape.kind === 'object') {
    if (!acc.some((o) => o.name === shape.name)) acc.push(shape)
    for (const f of shape.fields) collectObjects(f.shape, acc)
  } else if (shape.kind === 'array') {
    collectObjects(shape.elem, acc)
  }
  return acc
}

function parseObject(input: string): Record<string, unknown> | null {
  let data: unknown
  try {
    data = JSON.parse(input)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  return data as Record<string, unknown>
}

const tsType = (s: Shape): string => {
  switch (s.kind) {
    case 'string': return 'string'
    case 'number': return 'number'
    case 'boolean': return 'boolean'
    case 'null': return 'null'
    case 'any': return 'any'
    case 'array': return `${tsType(s.elem)}[]`
    case 'object': return s.name
  }
}

const goType = (s: Shape): string => {
  switch (s.kind) {
    case 'string': return 'string'
    case 'number': return s.int ? 'int' : 'float64'
    case 'boolean': return 'bool'
    case 'null': return 'interface{}'
    case 'any': return 'interface{}'
    case 'array': return `[]${goType(s.elem)}`
    case 'object': return s.name
  }
}

const javaType = (s: Shape): string => {
  switch (s.kind) {
    case 'string': return 'String'
    case 'number': return s.int ? 'int' : 'double'
    case 'boolean': return 'boolean'
    case 'null': return 'Object'
    case 'any': return 'Object'
    case 'array': return `List<${javaBoxed(s.elem)}>`
    case 'object': return s.name
  }
}
// Java 泛型需要装箱类型
const javaBoxed = (s: Shape): string => {
  switch (s.kind) {
    case 'number': return s.int ? 'Integer' : 'Double'
    case 'boolean': return 'Boolean'
    case 'string': return 'String'
    case 'object': return s.name
    case 'array': return `List<${javaBoxed(s.elem)}>`
    default: return 'Object'
  }
}

export function jsonToTs(input: string): ToolResult {
  const obj = parseObject(input)
  if (!obj) return err('请输入 JSON 对象')
  const objs = collectObjects(inferShape(obj, 'Root'))
  return ok(
    objs
      .map((o) => `interface ${o.name} {\n${o.fields.map((f) => `  ${f.key}: ${tsType(f.shape)}`).join('\n')}\n}`)
      .join('\n\n'),
  )
}

export function jsonToGo(input: string): ToolResult {
  const obj = parseObject(input)
  if (!obj) return err('请输入 JSON 对象')
  const objs = collectObjects(inferShape(obj, 'Root'))
  return ok(
    objs
      .map(
        (o) =>
          `type ${o.name} struct {\n${o.fields
            .map((f) => `\t${pascal(f.key)} ${goType(f.shape)} \`json:"${f.key}"\``)
            .join('\n')}\n}`,
      )
      .join('\n\n'),
  )
}

export function jsonToJava(input: string): ToolResult {
  const obj = parseObject(input)
  if (!obj) return err('请输入 JSON 对象')
  const objs = collectObjects(inferShape(obj, 'Root'))
  return ok(
    objs
      .map((o) => `class ${o.name} {\n${o.fields.map((f) => `  ${javaType(f.shape)} ${f.key};`).join('\n')}\n}`)
      .join('\n\n'),
  )
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test codegen`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add lib/tools/codegen.ts tests/codegen.test.ts && git commit -m "feat: JSON to TS/Go/Java codegen"
```

---

## Task 6: 类型 + 注册表

**Files:**
- Modify: `lib/tools/types.ts`
- Modify: `lib/tools/registry.ts`
- Modify: `tests/registry.test.ts`

- [ ] **Step 1: 补失败测试**

在 `tests/registry.test.ts` 的 `describe('registry', ...)` 内追加：
```ts
  it('registers batch-3a io tools that run', () => {
    expect(findTool('json-to-csv')!.run!('[{"a":1}]').output).toBe('a\n1')
    expect(findTool('json-to-ts')!.run!('{"a":1}').output).toContain('interface Root')
  })
  it('registers jsonpath-query with query layout and no run', () => {
    expect(findTool('jsonpath-query')!.layout).toBe('query')
    expect(findTool('jsonpath-query')!.run).toBeUndefined()
  })
  it('search finds batch-3a tools', () => {
    expect(searchTools('xml').some((t) => t.id === 'json-to-xml')).toBe(true)
    expect(searchTools('jsonpath').some((t) => t.id === 'jsonpath-query')).toBe(true)
  })
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test registry`
Expected: FAIL。

- [ ] **Step 3: `lib/tools/types.ts` 加布局**

把 `ToolLayout` 改为：
```ts
export type ToolLayout = 'io' | 'diff' | 'regex' | 'qrcode' | 'query'
```

- [ ] **Step 4: `lib/tools/registry.ts` 注册**

在 import 区追加：
```ts
import { jsonToCsv } from './csv'
import { jsonToXml, xmlToJson } from './xml'
import { jsonToTs, jsonToGo, jsonToJava } from './codegen'
```

在 `TOOLS` 数组末尾追加：
```ts
  { id: 'jsonpath-query', category: 'json', name: 'JSONPath 查询', keywords: ['jsonpath', 'query', '查询', '路径'], layout: 'query' },
  { id: 'json-to-xml', category: 'convert', name: 'JSON 转 XML', keywords: ['xml', 'json', '转换'], layout: 'io', run: (i) => jsonToXml(i) },
  { id: 'xml-to-json', category: 'convert', name: 'XML 转 JSON', keywords: ['xml', 'json', '转换'], layout: 'io', run: (i) => xmlToJson(i) },
  { id: 'json-to-csv', category: 'convert', name: 'JSON 转 CSV', keywords: ['csv', 'json', '转换', '表格'], layout: 'io', run: (i) => jsonToCsv(i) },
  { id: 'json-to-ts', category: 'convert', name: 'JSON 转 TS 接口', keywords: ['typescript', 'ts', 'interface', '实体类'], layout: 'io', run: (i) => jsonToTs(i) },
  { id: 'json-to-go', category: 'convert', name: 'JSON 转 Go 结构体', keywords: ['go', 'golang', 'struct', '实体类'], layout: 'io', run: (i) => jsonToGo(i) },
  { id: 'json-to-java', category: 'convert', name: 'JSON 转 Java 类', keywords: ['java', 'class', '实体类'], layout: 'io', run: (i) => jsonToJava(i) },
```

- [ ] **Step 5: 运行确认通过**

Run: `pnpm test`
Expected: 全部通过。

- [ ] **Step 6: Commit**

```bash
git add lib/tools/types.ts lib/tools/registry.ts tests/registry.test.ts && git commit -m "feat: register batch-3a json tools + query layout"
```

---

## Task 7: QueryPanel（query 布局）+ App 分发

**Files:**
- Create: `components/QueryPanel.tsx`
- Modify: `entrypoints/app/App.tsx`

> 与 RegexPanel 同构：顶部表达式输入条 + 双栏（JSON 输入 / 结果只读）+ `aria-live` 状态栏。复用 `Editor`（json 语法高亮）。

- [ ] **Step 1: 创建 `components/QueryPanel.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { Editor } from './Editor'
import { queryJsonPath } from '@/lib/tools/jsonpath'
import { AlertIcon, CheckIcon } from '@/components/icons'
import type { ToolDef } from '@/lib/tools/types'

function PaneHeader({ label }: { label: string }) {
  return (
    <div className="flex h-8 shrink-0 items-center border-b border-zinc-200 bg-zinc-50/80 px-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{label}</span>
    </div>
  )
}

export function QueryPanel({ tool }: { tool: ToolDef }) {
  const [json, setJson] = useState('')
  const [path, setPath] = useState('$')

  const result = useMemo(() => queryJsonPath(json, path), [json, path])
  const hasJson = json.trim().length > 0

  return (
    <section aria-label={tool.name} className="flex min-w-0 flex-1 flex-col bg-white dark:bg-zinc-950">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-zinc-200 px-3 dark:border-zinc-800">
        <span className="shrink-0 font-mono text-xs text-zinc-400">JSONPath</span>
        <input
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="$.store.book[*].author"
          spellCheck={false}
          aria-label="JSONPath 表达式"
          className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-mono text-sm outline-none focus:border-teal-500/50 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-2">
        <div className="flex min-w-0 flex-col border-r border-zinc-200 dark:border-zinc-800">
          <PaneHeader label="JSON" />
          <div className="min-h-0 flex-1">
            <Editor value={json} onChange={setJson} language="json" />
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <PaneHeader label="结果" />
          <div className="min-h-0 flex-1">
            <Editor value={result.ok ? result.output : ''} readOnly language="json" />
          </div>
        </div>
      </div>

      <div aria-live="polite" className="flex h-9 shrink-0 items-center border-t border-zinc-200 px-4 text-xs dark:border-zinc-800">
        {!hasJson ? (
          <span className="text-zinc-400">输入 JSON 与表达式后自动查询</span>
        ) : result.ok ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckIcon className="h-3.5 w-3.5" />
            查询完成
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <AlertIcon className="h-3.5 w-3.5" />
            {result.error?.message}
          </span>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: App 分发**

`entrypoints/app/App.tsx`：顶部加 `import { QueryPanel } from '@/components/QueryPanel'`；在 `ToolView` 的 `switch` 加：
```tsx
    case 'query':
      return <QueryPanel tool={tool} />
```

- [ ] **Step 3: 验证编译 + 构建**

Run: `pnpm compile && pnpm build`
Expected: 通过。

- [ ] **Step 4: 手动验证**

命令面板搜「JSONPath 查询」打开：左侧粘贴 `{"store":{"book":[{"author":"A"},{"author":"B"}]}}`，表达式 `$.store.book[*].author` → 右侧得 `["A","B"]`；非法 JSON / 表达式有错误提示。再试「JSON 转 TS 接口 / Go / Java」「JSON 转 XML / CSV」。

- [ ] **Step 5: Commit**

```bash
git add components/QueryPanel.tsx entrypoints/app/App.tsx && git commit -m "feat: JSONPath query panel (query layout)"
```

---

## Task 8: 收尾

- [ ] **Step 1: 全量校验**

Run: `pnpm test && pnpm compile && pnpm build`
Expected: 全绿。

- [ ] **Step 2: Commit（如有改动）**

```bash
git add -A && git commit -m "chore: batch-3a json tools green"
```

---

## Self-Review 备注（已核对）

- **Spec 覆盖（§11 第 3 批的 JSON 部分）**：JSONPath 查询（Task 2 + Task 7 UI）、JSON↔XML（Task 4）、JSON→CSV（Task 3）、JSON→实体类 Go/TS/Java（Task 5）。第 3 批的 JMESPath、Excel、加解密、二维码不在本计划——JMESPath 与 Excel 可作为 3A 增量后续；加解密归 3B、二维码归 3C。
- **类型一致性**：io 工具复用 `ToolResult`/`ok`/`err` 与注册表 `run`；`jsonpath-query` 无 `run`、`layout: 'query'`，由 `QueryPanel` 直接调 `queryJsonPath`（与 diff/regex 同构）。`ToolLayout` 新增 `'query'`。codegen 的 `Shape` 为内部类型，仅 `codegen.ts` 使用。
- **测试策略**：纯函数（jsonpath/csv/xml/codegen + registry 断言）全单测；`QueryPanel` 以 compile+build+手动验证覆盖（沿用既有策略）。
- **已知简化/留待后续**：实体类生成对联合类型/可选字段不做合并（数组取首元素、对象取出现键），Go 数字按整数/小数分 `int`/`float64`、Java 同理 `int`/`double`；CSV 仅支持「对象数组」且嵌套值序列化为 JSON 字符串；XML 用 `fast-xml-parser` 默认选项（属性前缀 `@_`）。JMESPath、JSON→Excel（`xlsx`，体积大、懒加载）留作 3A 后续增量。命令面板（Batch 2）自动收录新工具，无需改外壳。
```
