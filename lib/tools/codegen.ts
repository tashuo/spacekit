import { ok, err, type ToolResult } from './types'

type Shape =
  | { kind: 'string' }
  | { kind: 'number'; int: boolean }
  | { kind: 'boolean' }
  | { kind: 'null' }
  | { kind: 'any' }
  | { kind: 'array'; elem: Shape }
  | { kind: 'object'; name: string; fields: { key: string; shape: Shape }[] }

// key → PascalCase 类型名基；无字母数字时回退 'Field'
function pascal(key: string): string {
  const cleaned = key.replace(/[^a-zA-Z0-9]+(.)?/g, (_, c?: string) => (c ? c.toUpperCase() : ''))
  return cleaned ? cleaned[0].toUpperCase() + cleaned.slice(1) : 'Field'
}

// 分配唯一名称（冲突加数字后缀），用于类型名与字段名去重
function uniqueName(base: string, used: Set<string>): string {
  const root = base || 'Type'
  let name = root
  let i = 2
  while (used.has(name)) name = `${root}${i++}`
  used.add(name)
  return name
}

const isIdent = (s: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s)

// 清理为合法标识符（用于 Java 字段名）
function sanitizeIdent(s: string): string {
  let out = s.replace(/[^A-Za-z0-9_$]/g, '_')
  if (!out || /^[0-9]/.test(out)) out = `_${out}`
  return out
}

// 推断类型树。`used` 累积已分配的类型名，保证每个对象拿到全局唯一名，
// 避免「同名不同结构」被静默合并/丢弃。对象先占名再递归（DFS，Root 最先）。
function inferShape(value: unknown, base: string, used: Set<string>): Shape {
  if (value === null) return { kind: 'null' }
  if (Array.isArray(value)) {
    return { kind: 'array', elem: value.length ? inferShape(value[0], base, used) : { kind: 'any' } }
  }
  switch (typeof value) {
    case 'string':
      return { kind: 'string' }
    case 'number':
      return { kind: 'number', int: Number.isInteger(value) }
    case 'boolean':
      return { kind: 'boolean' }
    case 'object': {
      const name = uniqueName(base, used)
      const fields = Object.keys(value as object).map((key) => ({
        key,
        shape: inferShape((value as Record<string, unknown>)[key], pascal(key), used),
      }))
      return { kind: 'object', name, fields }
    }
    default:
      return { kind: 'any' }
  }
}

// 深度优先收集所有 object 形状（名称已唯一，Root 在前）
function collectObjects(
  shape: Shape,
  acc: Extract<Shape, { kind: 'object' }>[] = [],
): Extract<Shape, { kind: 'object' }>[] {
  if (shape.kind === 'object') {
    acc.push(shape)
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
    case 'string': return 'String'
    case 'number': return s.int ? 'Integer' : 'Double'
    case 'boolean': return 'Boolean'
    case 'null': return 'Object'
    case 'any': return 'Object'
    case 'array': return `List<${javaBoxed(s.elem)}>`
    case 'object': return s.name
  }
}

export function jsonToTs(input: string): ToolResult {
  const obj = parseObject(input)
  if (!obj) return err('请输入 JSON 对象')
  const objs = collectObjects(inferShape(obj, 'Root', new Set()))
  return ok(
    objs
      .map(
        (o) =>
          `interface ${o.name} {\n${o.fields
            .map((f) => `  ${isIdent(f.key) ? f.key : JSON.stringify(f.key)}: ${tsType(f.shape)}`)
            .join('\n')}\n}`,
      )
      .join('\n\n'),
  )
}

export function jsonToGo(input: string): ToolResult {
  const obj = parseObject(input)
  if (!obj) return err('请输入 JSON 对象')
  const objs = collectObjects(inferShape(obj, 'Root', new Set()))
  return ok(
    objs
      .map((o) => {
        const usedFields = new Set<string>()
        const lines = o.fields.map(
          (f) => `\t${uniqueName(pascal(f.key), usedFields)} ${goType(f.shape)} \`json:"${f.key}"\``,
        )
        return `type ${o.name} struct {\n${lines.join('\n')}\n}`
      })
      .join('\n\n'),
  )
}

export function jsonToJava(input: string): ToolResult {
  const obj = parseObject(input)
  if (!obj) return err('请输入 JSON 对象')
  const objs = collectObjects(inferShape(obj, 'Root', new Set()))
  return ok(
    objs
      .map((o) => {
        const usedFields = new Set<string>()
        const lines = o.fields.map(
          (f) => `  ${javaType(f.shape)} ${uniqueName(sanitizeIdent(f.key), usedFields)};`,
        )
        return `class ${o.name} {\n${lines.join('\n')}\n}`
      })
      .join('\n\n'),
  )
}
