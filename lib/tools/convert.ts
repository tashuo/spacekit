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
