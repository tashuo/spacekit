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
